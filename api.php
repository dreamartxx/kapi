<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
ini_set('display_errors', '0');
function respond(array $data, int $status=200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
set_exception_handler(function(Throwable $e) { error_log('KAPI: '.$e->getMessage()); respond(['error'=>'İşlem tamamlanamadı. Sunucu dosya izinlerini ve hata günlüğünü kontrol edin.'],500); });
$directory = getenv('KAPI_DATA_DIR') ?: __DIR__.'/data';
if (!is_dir($directory) && !mkdir($directory,0700,true) && !is_dir($directory)) throw new RuntimeException('Data directory unavailable');
$lock = fopen($directory.'/lock.php','c+');
if (!$lock || !flock($lock,LOCK_EX)) throw new RuntimeException('Storage lock unavailable');
$statePath = $directory.'/state.php';
$prefix = "<?php http_response_code(404); exit; ?>\n";
function persist(): void { global $state,$statePath,$prefix,$directory; $temp = tempnam($directory,'state-'); if($temp===false) throw new RuntimeException('Temporary storage unavailable'); try { $json = json_encode($state, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); if(file_put_contents($temp,$prefix.$json)===false || !chmod($temp,0600) || !rename($temp,$statePath)) throw new RuntimeException('Storage update failed'); } finally { if(is_file($temp)) unlink($temp); } }
if(is_file($statePath)) { $raw = file_get_contents($statePath); if($raw===false || !str_starts_with($raw,$prefix)) throw new RuntimeException('Invalid state file'); $state=json_decode(substr($raw,strlen($prefix)),true,512,JSON_THROW_ON_ERROR); }
else { $state=['password_hash'=>null,'setup_key'=>bin2hex(random_bytes(24)),'auth_version'=>1,'revision'=>1,'portals'=>require __DIR__.'/defaults.php','attempts'=>[]]; persist(); }
$action=$_GET['action']??'';
if($action==='portals' && $_SERVER['REQUEST_METHOD']==='GET') respond(['portals'=>$state['portals']]);
$secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
if(!$secure && !in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true)) respond(['error'=>'Yönetim paneli için HTTPS bağlantısı gereklidir.'],403);
ini_set('session.use_strict_mode','1');
session_name('kapi_admin');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']);
session_start();
if(isset($_SESSION['admin']) && (($_SESSION['last_seen']??0)<time()-1800 || ($_SESSION['version']??0)!==$state['auth_version'])) $_SESSION=[];
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$authorized = !empty($_SESSION['admin']);
if($authorized) $_SESSION['last_seen']=time();
if($action==='session' && $_SERVER['REQUEST_METHOD']==='GET') respond(['configured'=>!empty($state['password_hash']),'authenticated'=>$authorized,'csrf'=>$_SESSION['csrf'],'portals'=>$authorized?$state['portals']:null,'revision'=>$authorized?$state['revision']:null]);
if($_SERVER['REQUEST_METHOD']!=='POST') respond(['error'=>'Desteklenmeyen istek.'],405);
if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) respond(['error'=>'Oturum doğrulanamadı. Sayfayı yenileyin.'],403);
if((int)($_SERVER['CONTENT_LENGTH']??0)>32768) respond(['error'=>'İstek çok büyük.'],413);
$body=file_get_contents('php://input',false,null,0,32769);
if(strlen($body)>32768) respond(['error'=>'İstek çok büyük.'],413);
$input=json_decode($body,true);
if(!is_array($input)) respond(['error'=>'Geçersiz istek.'],400);
function validPassword(mixed $password): bool { return is_string($password) && preg_match('//u',$password)===1 && preg_match_all('/./us',$password)>=6 && strlen($password)<=72; }
function checkRate(): string { global $state; $now=time(); $state['attempts']=array_filter($state['attempts'],fn($v)=>$v['until']>$now); $ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown'); if(($state['attempts'][$ip]['count']??0)>=5) respond(['error'=>'Çok fazla deneme. 15 dakika sonra tekrar deneyin.'],429); return $ip; }
function failAuth(string $ip): never { global $state; $entry=$state['attempts'][$ip]??['count'=>0,'until'=>time()+900]; $entry['count']++; $state['attempts'][$ip]=$entry; persist(); respond(['error'=>'Giriş bilgileri doğru değil.'],401); }
function authenticate(): void { global $state; session_regenerate_id(true); $_SESSION=['admin'=>true,'last_seen'=>time(),'version'=>$state['auth_version'],'csrf'=>bin2hex(random_bytes(32))]; }
if($action==='setup') { if($state['password_hash']) respond(['error'=>'Kurulum zaten tamamlandı.'],409); $ip=checkRate(); if(!is_string($input['key']??null)||!hash_equals($state['setup_key'],$input['key'])) failAuth($ip); if(!validPassword($input['password']??null)) respond(['error'=>'Şifre en az 6 karakter, en fazla 72 bayt olmalı.'],422); $state['password_hash']=password_hash($input['password'],PASSWORD_DEFAULT); unset($state['setup_key']); $state['attempts']=[]; persist(); authenticate(); respond(['ok'=>true]); }
if($action==='login') { $ip=checkRate(); if(!$state['password_hash'] || !is_string($input['password']??null) || strlen($input['password'])>72 || !password_verify($input['password'],$state['password_hash'])) failAuth($ip); unset($state['attempts'][$ip]); persist(); authenticate(); respond(['ok'=>true]); }
if(!$authorized) respond(['error'=>'Yönetici girişi gerekli.'],401);
if($action==='logout') { $_SESSION=[]; session_destroy(); setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>'/','secure'=>$secure,'httponly'=>true,'samesite'=>'Strict']); respond(['ok'=>true]); }
if($action==='password') { $ip=checkRate(); if(!is_string($input['current']??null)||!password_verify($input['current'],$state['password_hash'])) failAuth($ip); if(!validPassword($input['password']??null)) respond(['error'=>'Yeni şifre en az 6 karakter, en fazla 72 bayt olmalı.'],422); $state['password_hash']=password_hash($input['password'],PASSWORD_DEFAULT); $state['auth_version']++; $state['attempts']=[]; persist(); authenticate(); respond(['ok'=>true]); }
if($action==='save') {
 if(($input['revision']??null)!==$state['revision']) respond(['error'=>'Portallar başka bir oturumda güncellendi. Sayfayı yenileyip tekrar deneyin.'],409);
 $portals=$input['portals']??null; if(!is_array($portals)||count($portals)!==7||!array_is_list($portals)) respond(['error'=>'Tam olarak 7 portal gerekli.'],422);
 $clean=[];
 foreach($portals as $i=>$p) {
  if(!is_array($p)||($p['id']??null)!==$i+1) respond(['error'=>'Portal sırası geçersiz.'],422);
  $row=['id'=>$i+1]; foreach(['name'=>60,'category'=>35,'description'=>160,'url'=>2048,'color'=>7] as $field=>$max) { if(!is_string($p[$field]??null)||strlen($p[$field])>$max*4) respond(['error'=>'Portal alanlarını kontrol edin.'],422); $value=trim($p[$field]); if(preg_match('//u',$value)!==1 || preg_match_all('/./us',$value)>$max || ($field!=='url' && $value==='')) respond(['error'=>'Portal alanlarını kontrol edin.'],422); $row[$field]=$value; }
  if(!preg_match('/^#[0-9a-fA-F]{6}$/D',$row['color'])) respond(['error'=>'Renk geçersiz.'],422);
  if($row['url']!=='') { $parsed=parse_url($row['url']); if(!filter_var($row['url'],FILTER_VALIDATE_URL)||!in_array(strtolower($parsed['scheme']??''),['http','https'],true)||isset($parsed['user'])||isset($parsed['pass'])) respond(['error'=>'Bağlantılar http:// veya https:// ile başlamalı ve geçerli olmalı.'],422); }
  $clean[]=$row;
 }
 $state['portals']=$clean; $state['revision']++; persist(); respond(['ok'=>true,'revision'=>$state['revision']]);
}
respond(['error'=>'İşlem bulunamadı.'],404);
