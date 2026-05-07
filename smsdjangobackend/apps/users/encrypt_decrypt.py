import hashlib
import base64
from cryptography.fernet import Fernet


def encrypt_password(password):
    hash_object = hashlib.sha256(b'Edubricz2021-07-28')
    hashed_key = hash_object.digest()
    fernet_key = base64.urlsafe_b64encode(hashed_key)
    cipher_suite = Fernet(fernet_key)
    encrypted_password=cipher_suite.encrypt(password.encode())
    return encrypted_password

def decrypt_password(password):
    hash_object = hashlib.sha256(b'Edubricz2021-07-28')
    hashed_key = hash_object.digest()
    fernet_key = base64.urlsafe_b64encode(hashed_key)
    cipher_suite = Fernet(fernet_key)
    password=password[1:]
    decrypted_password = cipher_suite.decrypt(password.encode()).decode()
    return decrypted_password
