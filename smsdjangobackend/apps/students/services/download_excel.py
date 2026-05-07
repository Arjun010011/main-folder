from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.models.custom import CustomForm
from apps.institutes.models import Institute

def download_student_data(self, data):
    print(data, 'nikhil')
    institute=Institute.get_institute(self)
    custom_data = CustomForm.objects.filter(
        form_for='admission_form',is_active=1
    ).values('field_structure')
    options={}
    options['title'] = 'Student Details'
    options['description'] = 'Student Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    if institute.code == "cordialhighschool":
        options['columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },
            {
                'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
            },
            {
                'column': 'Gender', 'required': False, 'schemacolumn': 'gender'
            },
            {
                'column': 'Standard Name', 'required': False, 'schemacolumn': 'current_standard_name'
            },{
                'column': 'Section Name', 'required': False, 'schemacolumn': 'current_standard_section_name'
            }
            ,{
                'column': 'Date Of Birth', 'required': False, 'schemacolumn': 'dob_str'
            },{
                'column': 'Father Name', 'required': False, 'schemacolumn': 'father_name'
            },{
                'column': 'Mother Name', 'required': False, 'schemacolumn': 'mother_name'
            },{
                'column': 'Guardian Name', 'required': False, 'schemacolumn': 'guardian_name'
            },{
                'column': 'Admission Number', 'required': False, 'schemacolumn': 'admission_num'
            },{
                'column': 'Register Number', 'required': False, 'schemacolumn': 'current_reg_num'
            },
            {
                'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
            },{
                'column': 'Student Aadhar Number', 'required': False, 'schemacolumn': 'aadhar_num'
            },{
                'column': 'Category', 'required': False, 'schemacolumn': 'category_name'
            },{
                'column': 'Caste', 'required': False, 'schemacolumn': 'caste_name'
            },{
                'column': 'Admission Date', 'required': False, 'schemacolumn': 'admission_date'
            }
        ]
    else:
        options['columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },
            {
                'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
            },
            {
                'column': 'Gender', 'required': False, 'schemacolumn': 'gender'
            },
            {
                'column': 'Standard Name', 'required': False, 'schemacolumn': 'current_standard_name'
            },{
                'column': 'Section Name', 'required': False, 'schemacolumn': 'current_standard_section_name'
            },
            {
                'column': 'Student Type', 'required': False, 'schemacolumn':'current_student_type_name'
            }
            ,{
                'column': 'Blood Group', 'required': False, 'schemacolumn':'blood_group'
            }
            ,{
                'column': 'Date Of Birth', 'required': False, 'schemacolumn': 'dob_str'
            },
            {
                'column': 'Sats Num', 'required': False, 'schemacolumn': 'sts'
            },{
                'column': 'Father Name', 'required': False, 'schemacolumn': 'father_name'
            },{
                'column': 'Father Mob', 'required': False, 'schemacolumn': 'f_mobile_num'
            },
            {
                'column': 'Mother Name', 'required': False, 'schemacolumn': 'mother_name'
            },{
                'column': 'Mother Mob', 'required': False, 'schemacolumn': 'm_mobile_num'
            },{
                'column': 'Guardian Name', 'required': False, 'schemacolumn': 'guardian_name'
            },{
                'column': 'Admission Number', 'required': False, 'schemacolumn': 'admission_num'
            },
            {
                'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
            },{
                'column': 'Student Aadhar Number', 'required': False, 'schemacolumn': 'aadhar_num'
            },{
                'column': 'Category', 'required': False, 'schemacolumn': 'category_name'
            },{
                'column': 'Caste', 'required': False, 'schemacolumn': 'caste_name'
            },{
                'column': 'Admission Date', 'required': False, 'schemacolumn': 'admission_date'
            },
            {
                'column': 'Address Line 1', 'required': False, 'schemacolumn': 'address_one'
            },
            {
                'column': 'Address Line 2', 'required': False, 'schemacolumn': 'address_two'
            },
            {
                'column': 'City', 'required': False, 'schemacolumn': 'city'
            },
            {
                'column': 'Pincode', 'required': False, 'schemacolumn': 'pincode'
            }
        ]
    for custom_admission_form in custom_data:
        for custom_fields in custom_admission_form['field_structure']:
            options['columns'].append({
                'column':custom_fields['label'], 'required': False, 'schemacolumn': custom_fields['name']
            })

    return write_to_excel_new(self, options, {}, {})