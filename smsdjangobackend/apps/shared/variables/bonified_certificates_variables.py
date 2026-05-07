bonified_certificate = [
    {
        'template_type': 'pdf', 'module': 'conduct_certificate', 'name': 'default_bonified_certificate',
        'no_of_copies': 1
    },
    {
        'template_type': 'pdf', 'module': 'conduct_certificate', 'name': 'jaihind_bonified_certificate',
        'no_of_copies': 1
    },
    {
        'template_type': 'pdf', 'module': 'bonified_certificate', 'name': 'shaala_drudikarana_certificate',
        'no_of_copies': 1
    }
]
bonified_certificate_json_variables = {
        "default_bonified_certificate": [
            {
                "label_name": "Today Date",
                "validation_rules": "text",
                "name": "today_date",
            },
            {
                "label_name": "Student",
                "validation_rules": "text",
                "name": "student_full_name",
            },
            {
                "label_name": "Father Name",
                "validation_rules": "text",
                "name": "father_name",
            },
            {
                "label_name": "Mother Name",
                "validation_rules": "text",
                "name": "mother_name",
            },
            {
                "label_name": "Standard Name",
                "validation_rules": "text",
                "name": "standard_name",
            },
            {
                "label_name": "Academic Year",
                "validation_rules": "text",
                "name": "academic_year",
            },
            {"label_name": "DOB", "validation_rules": "text", "name": "dob_str"},
            {
                "label_name": "Admission Number",
                "validation_rules": "text",
                "name": "admission_num",
            },
        ],
        "jaihind_bonified_certificate": [
            {
                "label_name": "Father Name",
                "validation_rules": "text",
                "name": "father_name",
            },
            {
                "label_name": "Mother Name",
                "validation_rules": "text",
                "name": "mother_name",
            },
            {
                "label_name": "Standard Name",
                "validation_rules": "text",
                "name": "standard_name",
            },
            {
                "label_name": "Academic Year",
                "validation_rules": "text",
                "name": "academic_year",
            },
            {"label_name": "DOB", "validation_rules": "text", "name": "dob_str"},
            {
                "label_name": "Admission Number",
                "validation_rules": "text",
                "name": "admission_num",
            },
            {"label_name": "Address", "validation_rules": "text", "name": "address"},
            {
                "label_name": "Student",
                "validation_rules": "text",
                "name": "student_full_name",
            },
            {"label_name": "Caste", "validation_rules": "text", "name": "caste"},
            {"label_name": "Religion", "validation_rules": "text", "name": "religion"},

            {"label_name": "SATS No", "validation_rules": "text", "name": "sts"},
        ],
        "shaala_drudikarana_certificate": [
            {
                "label_name": "Father Name",
                "validation_rules": "text",
                "name": "father_name",
            },
            {
                "label_name": "Mother Name",
                "validation_rules": "text",
                "name": "mother_name",
            },
            {
                "label_name": "Standard Name",
                "validation_rules": "text",
                "name": "standard_name",
            },
            {
                "label_name": "Academic Year",
                "validation_rules": "text",
                "name": "academic_year",
            },
            {"label_name": "DOB", "validation_rules": "text", "name": "dob_str"},
            {
                "label_name": "Admission Number",
                "validation_rules": "text",
                "name": "admission_num",
            },
            {"label_name": "Address", "validation_rules": "text", "name": "address"},
            {
                "label_name": "Student",
                "validation_rules": "text",
                "name": "student_full_name",
            },
            {"label_name": "Caste", "validation_rules": "text", "name": "caste"},
            {"label_name": "Religion", "validation_rules": "text", "name": "religion"},

            {"label_name": "SATS No", "validation_rules": "text", "name": "sts"},
            {"label_name": "AADHAR No", "validation_rules": "text", "name": "aadhar_num"},
            {"label_name": "From Standard", "validation_rules": "text", "name": "from_standard_name "},
            {"label_name": "To Standard", "validation_rules": "text", "name": "to_standard_name"},
            {"label_name": "Reason", "validation_rules": "text", "name": "reason"},
            {"label_name": "School_City", "validation_rules": "text", "name": "school_city"},
            {"label_name": "School_Pincode", "validation_rules": "text", "name": "school_pincode"},
            {"label_name": "School_District", "validation_rules": "text", "name": "school_district"},
            {"label_name": "DOB in words", "validation_rules": "text", "name":"dob_in_words"}
        ]
}