def get_lop_attendance_list():
    return {
        'present': {
            'description': 'Present',
            'status': 'present',
            'alias_name': 'P',
            'deductable_count': 0,
            'is_salary_deducted_day': 0,
            'color': 'green'
        },
        'absent':{
            'description': 'Absent',
            'alias_name': 'A',
            'status': 'absent',
            'deductable_count': 1,
            'is_salary_deducted_day': 1,
            'color': 'red'
        },
        'late': {
            'description': 'Late',
            'alias_name': 'L',
            'status': 'late',
            'deductable_count': 0,
            'is_salary_deducted_day': 0,
            'color': ''
        },
        'lateandhalfday': {
            'description': 'Late and Half Day',
            'alias_name': 'LAH',
            'status': 'lateandhalfday',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 0
        },
        'halfdaylate': {
            'description': 'Half Day and Late',
            'alias_name': 'HDL',
            'status': 'halfdaylate',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 0
        },
        'halfday': {
            'description': 'Half Day',
            'alias_name': 'HD',
            'status': 'halfday',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 1
        },
        'unmarked': {
            'description': 'Unmarked',
            'alias_name': 'U',
            'status': 'unmarked',
            'deductable_count': 1,
            'is_salary_deducted_day': 1,
            'color': 'red'
        },
        'shiftnotassigned': {
            'description': 'Shift is not assigned',
            'alias_name': 'SNA',
            'status': 'shiftnotassigned',
            'deductable_count': 1,
            'is_salary_deducted_day': 1,
            'color': 'red'
        },
        'nonworkingday': {
            'description': 'Non working day',
            'alias_name': 'N',
            'status': 'nonworkingday',
            'deductable_count': 0,
            'is_salary_deducted_day': 0,
            'color': 'green'
        },
        'lop_attendance': {
            'description': 'Lop Marked Day',
            'alias_name': 'LMD',
            'status': 'lop_attendance',
            'deductable_count': 1,
            'is_salary_deducted_day': 1,
            'color': 'red'
        },
        'leave_applied': {
            'description': 'Leave applied for the day',
            'alias_name': 'LAP',
            'status': 'leave_applied',
            'deductable_count': 0,
            'is_salary_deducted_day': 0,
            'color': 'orange'
        },
        'first_ses_leave_sec_sess_half': {
            'description': 'First Session Leave Applied and Second Session Halfday',
            'alias_name': 'FSLASSH',
            'status': 'first_ses_leave_sec_sess_half',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 1,
            'color': 'black'
        },
        'first_ses_half_sec_sess_leave': {
            'description': 'First Session Half Day and Second Session Leave Applied',
            'alias_name': 'FHSL',
            'status': 'first_ses_half_sec_sess_leave',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 1,
            'color': 'black'
        },
        'holiday': {
            'description': 'Holiday',
            'alias_name': 'H',
            'status': 'holiday',
            'deductable_count': 0,
            'is_salary_deducted_day': 0,
            'color': 'blue'
        },
        'checkinmarked': {
            'description': 'Only Checkin is marked',
            'alias_name': 'c',
            'status': 'checkinmarked',
            'deductable_count': 1,
            'is_salary_deducted_day': 1,
            'color': 'red'
        },
        'halfdayandlate': {
            'description': 'First Half Leave and Second Half Late',
            'alias_name': 'hdal',
            'status': 'halfdayandlate',
            'deductable_count': 0.5,
            'is_salary_deducted_day': 0,
            'color': 'red'
        }
    }