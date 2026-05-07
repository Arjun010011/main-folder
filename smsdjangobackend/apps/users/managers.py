from django.contrib.auth.base_user import BaseUserManager
from django.db import transaction
from rest_framework import exceptions
from apps.users.encrypt_decrypt import encrypt_password

from apps.tenants.services.middlewares import get_current_db_name


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, password, is_central_signup=True, **extra_fields):

        from apps.users.services import user_group, auth  # Declared here because getting error
        with transaction.atomic(using=get_current_db_name()):
            groupIds = list(set(extra_fields.pop('groups')))
            mobileNum = None
            email = None
            if 'mobile_num' in extra_fields:
                mobileNum = extra_fields['mobile_num']
                del extra_fields['mobile_num']
            if 'email' in extra_fields:
                email = extra_fields['email']
                del extra_fields['email']
            user = self.model(username=username, **extra_fields)
            user.password_two = encrypt_password(password)
            user.set_password(password)
            extra_fields['mobile_num'] = mobileNum
            extra_fields['email'] = email
            data = {'username': username, 'password': password, **extra_fields}
            if is_central_signup:
                auth.central_sign_up(self, data)
            user.save(using=self._db)
            groupData = {'user': user.id, 'groups': groupIds}
            user_group.add_user_to_groups(self, groupData, user)
        return user

    def _create_user_validate(self, username, password, **extra_fields):

        if not username:
            raise exceptions.ValidationError("Username cannot be null")
        if self.model.isUsernameExist(self, username):
            raise exceptions.ValidationError("Username already exist")
        return self._create_user(username, password, **extra_fields)

    def create_user(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', False)
        return self._create_user_validate(username, password, **extra_fields)

    def create_superuser(self, username, password, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('groups', [1])

        return self._create_user_validate(username, password, **extra_fields)
