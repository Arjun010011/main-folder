import io
import os
from django.contrib import admin, messages
from django import forms
from django.conf import settings
from django.shortcuts import redirect, render
from django.urls import path, reverse

import boto3

from apps.institutes.models import ServiceTagList
from apps.institutes.models.academic_year_branch import AcademicYearBranchMapping
from apps.institutes.models.institute import Institute
from apps.shared.models.document import Document


@admin.register(ServiceTagList)
class ServiceTagListAdmin(admin.ModelAdmin):
    pass


class UploadLoginLogoForm(forms.Form):
    login_logo = forms.ImageField(
        required=True,
        help_text='Any image (JPG, PNG, etc.). Will be converted to PNG and stored as <code>.edubricz.com.png',
    )


class StaticImagesUploadForm(forms.Form):
    image_name = forms.CharField(
        max_length=255,
        required=True,
        strip=True,
        help_text='Name to save the file as (no spaces or slashes). Extension is taken from the uploaded file.',
        widget=forms.TextInput(attrs={'placeholder': 'e.g. banner or logo'}),
    )
    image_file = forms.ImageField(
        required=True,
        help_text='Image file to upload. Stored under institute_id/companies-images/ with the name you give above.',
    )

    def clean_image_name(self):
        name = (self.cleaned_data.get('image_name') or '').strip()
        if not name:
            raise forms.ValidationError('Image name is required.')
        if ' ' in name or '/' in name or '\\' in name:
            raise forms.ValidationError('Image name must not contain spaces or slashes.')
        return name


@admin.register(Institute)
class InstituteAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'company_id')
    search_fields = ('name', 'code')
    change_form_template = 'admin/institutes/institute/change_form.html'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/upload-login-logo/',
                self.admin_site.admin_view(self.upload_login_logo_view),
                name='institutes_institute_upload_login_logo',
            ),
            path(
                '<path:object_id>/static-images/',
                self.admin_site.admin_view(self.static_images_view),
                name='institutes_institute_static_images',
            ),
        ]
        return custom_urls + urls

    def upload_login_logo_view(self, request, object_id):
        institute = self.get_object(request, object_id)
        if not institute:
            self.message_user(request, 'Institute not found.', level=messages.ERROR)
            return redirect('..')
        if not institute.code:
            self.message_user(request, 'Institute code is required (e.g. productiontest for productiontest.edubricz.com).', level=messages.ERROR)
            return redirect(reverse('admin:institutes_institute_change', args=[object_id]))

        # File name: <institute.code>.edubricz.com.png (e.g. productiontest.edubricz.com.png)
        file_name = f'{institute.code}.edubricz.com.png'
        key = f'companies-images/logos/{file_name}'
        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        if not bucket:
            self.message_user(request, 'AWS_STORAGE_BUCKET_NAME is not configured.', level=messages.ERROR)
            return redirect(reverse('admin:institutes_institute_change', args=[object_id]))

        if request.method == 'POST':
            form = UploadLoginLogoForm(request.POST, request.FILES)
            if form.is_valid():
                from PIL import Image
                img_file = form.cleaned_data['login_logo']
                img = Image.open(img_file)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGBA')
                else:
                    img = img.convert('RGB')
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                buffer.seek(0)
                region = getattr(settings, 'AWS_REGION_NAME', None)
                access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
                secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
                client_kwargs = {}
                if region:
                    client_kwargs['region_name'] = region
                if access_key and secret_key:
                    client_kwargs['aws_access_key_id'] = access_key
                    client_kwargs['aws_secret_access_key'] = secret_key
                s3 = boto3.client('s3', **client_kwargs)
                s3.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=buffer.getvalue(),
                    ContentType='image/png',
                )
                self.message_user(request, f'Uploaded login logo as {file_name} to {bucket}/{key}', level=messages.SUCCESS)
                return redirect(reverse('admin:institutes_institute_change', args=[object_id]))
        else:
            form = UploadLoginLogoForm()

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'original': institute,
            'form': form,
            'title': 'Upload login logo',
            'key_path': key,
        }
        return render(request, 'admin/institutes/institute/upload_login_logo.html', context)

    def static_images_view(self, request, object_id):
        # Resolve "current institute" for the logged-in user. In this codebase, many services
        # assume a single active institute and use Institute.objects.first().
        current_institute = Institute.objects.first()
        if not current_institute:
            self.message_user(request, 'No Institute found.', level=messages.ERROR)
            return redirect('..')
        institute = current_institute

        # If user clicked another institute's URL, redirect to current institute view.
        try:
            if str(object_id) != str(institute.id):
                return redirect(reverse('admin:institutes_institute_static_images', args=[institute.id]))
        except Exception:
            pass

        bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        if not bucket:
            self.message_user(request, 'AWS_STORAGE_BUCKET_NAME is not configured.', level=messages.ERROR)
            return redirect(reverse('admin:institutes_institute_change', args=[object_id]))

        region = getattr(settings, 'AWS_REGION_NAME', None)
        access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        client_kwargs = {}
        if region:
            client_kwargs['region_name'] = region
        if access_key and secret_key:
            client_kwargs['aws_access_key_id'] = access_key
            client_kwargs['aws_secret_access_key'] = secret_key
        s3 = boto3.client('s3', **client_kwargs)

        prefix = f'{institute.id}/companies-images/'

        if request.method == 'POST':
            form = StaticImagesUploadForm(request.POST, request.FILES)
            if form.is_valid():
                image_name = form.cleaned_data['image_name']
                f = form.cleaned_data['image_file']
                content_type = getattr(f, 'content_type', '') or 'image/png'
                original_name = getattr(f, 'name', '') or 'file'
                _, ext = os.path.splitext(original_name)
                ext = (ext or '').lower()
                if not ext:
                    ext = '.png'
                # Save with the name user gave (no spaces/slashes), plus extension from file
                stored_name = f'{image_name}{ext}'
                key = f'{prefix}{stored_name}'

                s3.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=f.read(),
                    ContentType=content_type or 'application/octet-stream',
                )

                Document.objects.create(
                    file=key,
                    file_name=stored_name,
                    size=float(getattr(f, 'size', 0) or 0),
                    content_type=content_type,
                    is_active=True,
                )
                self.message_user(request, f'Uploaded as {stored_name} to {bucket}/{key}', level=messages.SUCCESS)
                return redirect(reverse('admin:institutes_institute_static_images', args=[object_id]))
        else:
            form = StaticImagesUploadForm()

        documents = Document.objects.filter(file__startswith=prefix).order_by('-created')[:200]

        custom_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
        if custom_domain:
            def build_url(k):
                return f'https://{custom_domain}/{k}'
        else:
            def build_url(k):
                if region:
                    return f'https://{bucket}.s3.{region}.amazonaws.com/{k}'
                return f'https://{bucket}.s3.amazonaws.com/{k}'

        upload_rows = [
            {
                'id': d.id,
                'stored_name': d.file_name or (d.file.name.split('/')[-1] if getattr(d.file, 'name', '') else ''),
                'original_name': '',
                'created_at': d.created,
                's3_key': d.file.name if getattr(d.file, 'name', None) else str(d.file),
                'url': build_url(d.file.name if getattr(d.file, 'name', None) else str(d.file)),
                'content_type': d.content_type or '',
                'size': int(d.size or 0),
                'uploaded_by': '',
                'tracked': True,
            }
            for d in documents
        ]

        # Also list whatever already exists in S3 under the prefix, even if not tracked in DB.
        tracked_keys = {row['s3_key'] for row in upload_rows}
        s3_rows = []
        try:
            paginator = s3.get_paginator('list_objects_v2')
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get('Contents', []) or []:
                    key = obj.get('Key')
                    if not key or key.endswith('/') or key == prefix:
                        continue
                    if key in tracked_keys:
                        continue
                    s3_rows.append(
                        {
                            'stored_name': key.split('/')[-1],
                            'original_name': '',
                            'created_at': obj.get('LastModified'),
                            's3_key': key,
                            'url': build_url(key),
                            'content_type': '',
                            'size': obj.get('Size') or 0,
                            'uploaded_by': '',
                            'tracked': False,
                        }
                    )
        except Exception:
            # If listing fails due to permissions, keep the page usable with DB data only.
            s3_rows = []

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'original': institute,
            'form': form,
            'title': 'Static images',
            'prefix': prefix,
            'upload_rows': upload_rows,
            's3_rows': s3_rows,
        }
        return render(request, 'admin/institutes/institute/static_images.html', context)


class AcademicYearBranchMappingAdmin(admin.ModelAdmin):
    list_display = ('get_academic_year', 'get_branch_name', 'academic_year')

    # @admin.display(ordering='', description='')
    def get_academic_year(self, obj):
        return obj.academic_year.start_date.strftime('%Y-%m-%d') + ' -> ' + obj.academic_year.end_date.strftime('%Y-%m-%d')

    def get_branch_name(self, obj):
        return obj.branch.name

admin.site.register(AcademicYearBranchMapping, AcademicYearBranchMappingAdmin)