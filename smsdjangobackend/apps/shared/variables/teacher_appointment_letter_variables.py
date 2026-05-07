teacher_appointment_letter = [
    {
        'template_type': 'pdf', 'module': 'teacher_appointment_letter', 'name': 'teacher_appointment_letter',
        'no_of_copies': 1
    },
    {
        'template_type': 'pdf', 'module': 'teacher_appointment_letter', 'name': 'lr_cambridge_teacher_appointment_letter',
        'no_of_copies': 1
    },
    #  {
    #     'template_type': 'pdf', 'module': 'teacher_appointment_letter', 'name': 'jaihind_sport_certificate',
    #     'no_of_copies': 1
    # },
]
teacher_appointment_letter_json_variables = {
        "default": [
            {
                "label_name": "Staff",
                "validation_rules": "text",
                "name": "staff_full_name",
            },      
            ],
            "lr_cambridge_teacher_appointment_letter": [
            {
                "label_name": "Todays Date",
                "validation_rules": "text",
                "name": "today_date"
            },

            {
                "label_name": "Staff",
                "validation_rules": "text",
                "name": "staff_full_name"
            },
            {
                "label_name": "Staff Address",
                "validation_rules": "text",
                "name": "staff_address"
            },
            {
                "label_name": "Position",
                "validation_rules": "text",
                "name": "designation"
            },
            {
                "label_name": "Reporting To",
                "validation_rules": "text",
                "name": "reporting_too"
            },
            {
                "label_name": "Start Date",
                "validation_rules": "date",
                "name": "date_joined"
            },
            {
                "label_name": "End Date",
                "validation_rules": "date",
                "name": "date_left"
            },
            {
                "label_name": "Gross Salary",
                "validation_rules": "text",
                "name": "gross_salary"
            },
            
            {
                "label_name": "Gross Salary (in words)",
                "validation_rules": "text",
                "name": "gross_salary_in_words"
            },
            {
                "label_name": "Organization Name",
                "validation_rules": "text",
                "name": "organization_name"
            },
            {
                "label_name": "Signer Name",
                "validation_rules": "text",
                "name": "signer_name"
            },
            {
                "label_name": "Signer Position",
                "validation_rules": "text",
                "name": "signer_position"
            },
             {
                    "label_name": "Basic Salary",
                    "validation_rules": "number",
                    "name": "basic_salary"
                },
                {
                    "label_name": "HRA",
                    "validation_rules": "number",
                    "name": "hra"
                },
                {
                    "label_name": "Variable Pay",
                    "validation_rules": "number",
                    "name": "variable_pay"
                },
                {
                    "label_name": "Provident Fund",
                    "validation_rules": "number",
                    "name": "pf"
                },
                {
                    "label_name": "ESI",
                    "validation_rules": "number",
                    "name": "esi"
                },
                {
                    "label_name": "Total Deductions",
                    "validation_rules": "number",
                    "name": "total_deductions"
                },
                {
                    "label_name": "Net Salary",
                    "validation_rules": "number",
                    "name": "salary"
                }

            ]

    }    