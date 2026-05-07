import base64
from Crypto.Cipher import AES
import json


bs = 16
iv = 'fj0RH5hm2El7FV8y' #dont change this is the key to decrypt 

def pad(s):
    return s + (bs - len(s) % bs) * chr(bs - len(s) % bs).encode('utf8')
def unpad(s):
    return s[:-ord(s[len(s)-1:])]

def encrypt(raw,password):

    raw = pad(raw)
    iv = password[:16]
    aes = AES.new(password.encode('utf-8'), AES.MODE_CBC,iv.encode('utf-8'))
    return base64.b64encode(aes.encrypt(raw)).decode('utf-8')


def decrypt(enc,password):
    enc = base64.b64decode(enc)
    aes = AES.new(password.encode('utf-8'), AES.MODE_CBC,iv.encode('utf-8'))
    return unpad(aes.decrypt(enc)).decode('utf-8')
