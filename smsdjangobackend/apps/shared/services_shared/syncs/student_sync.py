from apps.students.models.student import Student
from apps.students.models.studentDetail import GuardianDetail, ParentDetail, StudentDetails, StudentParentMapping


def sync_copy_father_number_to_primary_number(self, params):
    mappings = StudentParentMapping.objects.select_related('student', 'parent')

    for mapping in mappings:
        student = mapping.student
        parent = mapping.parent

        if parent and parent.f_mobile_num and not student.mobile_num:
            student.mobile_num = parent.f_mobile_num
            student.save(update_fields=['mobile_num'])


def sync_remove_spaces_from_aadhar_card(self, params):
    student_detail_data = StudentDetails.objects.filter(aadhar_num__isnull=False)
    for student_detail in student_detail_data:
        print(student_detail.aadhar_num)
        if student_detail.aadhar_num:
            cleaned_aadhar = student_detail.aadhar_num.replace(" ", "")
            if cleaned_aadhar != student_detail.aadhar_num:
                student_detail.aadhar_num = cleaned_aadhar
                student_detail.save()
    # Update ParentDetail - fields f_aadhar and m_aadhar
    parent_data = ParentDetail.objects.exclude(f_aadhar__isnull=False).exclude(m_aadhar__isnull=False)
    for parent in parent_data:
        updated = False
        
        if parent.f_aadhar and " " in parent.f_aadhar:
            parent.f_aadhar = parent.f_aadhar.replace(" ", "")
            updated = True
            
        if parent.m_aadhar and " " in parent.m_aadhar:
            parent.m_aadhar = parent.m_aadhar.replace(" ", "")
            updated = True
            
        if updated:
            parent.save()

    # Update Guardian - field g_aadhar
    guardian_data = GuardianDetail.objects.exclude(g_aadhar__isnull=False)
    for guardian in guardian_data:
        if guardian.g_aadhar and " " in guardian.g_aadhar:
            guardian.g_aadhar = guardian.g_aadhar.replace(" ", "")
            guardian.save()