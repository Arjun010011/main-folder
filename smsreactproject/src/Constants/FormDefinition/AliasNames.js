
import { nameRegex, emailRegex, nameWithQuoteRegex, pinCodeRegex } from 'Constants/regularExpression'
import { GET_URL } from 'Includes/urls'
import { minDate, lastYearDate } from 'Constants';

import { dateFormat } from 'Includes/functions';

const Form_Details = [{
    page_details: {
        form_name: 'alias_name',
        form_label: 'Alias Names',
        request_type: 'web',
        sub_sections: {
            alias_names: {
                name: 'alias_details',
                label: 'Alias Details',
                only_alias: true,
                list: [
                    { label: 'School', name: 'school', alias_name: 'School' },
                    { label: 'Standard', name: 'standard', alias_name: 'Standard' },
                    { label: 'Section', name: 'section', alias_name: 'Section' },
                    { label: 'First Language', name: 'first_language', alias_name: 'First Language' },
                    { label: 'Second Language', name: 'second_language', alias_name: 'Second Language' },
                    { label: 'Third Language', name: 'third_language', alias_name: 'Third Language' },
                    { label: 'Cumulative', name: 'cumulative', alias_name: 'Cumulative' },
                    { label: 'Written', name: 'written', alias_name: 'Written' },
                    { label: 'Discount', name: 'discount', alias_name: 'Discount' },
                ]
            },
        }
    }
}
]

export default Form_Details