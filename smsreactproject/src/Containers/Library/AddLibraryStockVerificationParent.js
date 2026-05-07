import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Swal from 'sweetalert2';
import MultipleAdd from 'Components/MultipleAdd';
import { nameAndNumberWithSpecialCharacterRegex } from 'Constants/regularExpression';
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';

const fieldDetails = [
    {
        label: 'Name',
        regex: nameAndNumberWithSpecialCharacterRegex, 
        autoFocus: false, 
        name: 'name', 
        md: 6, 
        maxLength: '50',
        className: 'width-80', 
        required: true, 
        id: 'outlined-textarea', 
        default: '',
        rows: null, 
        type: 'text'
    },
];

const AddLibraryStockVerificationParent = () => {
    const [submitDisable, setSubmitDisable] = useState(false);
    const history = useHistory();

    const postMethod = (libraryStockData) => {
        const post_data = { data_list: libraryStockData };
        setSubmitDisable(true);
        const url = POST_URL.librarystockverificationparent.api;
        
        postRequest(url, post_data)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    });
                    history.push(Actions.library_stock_verification_parent.view.url);
                }
                setSubmitDisable(false);
            });
    };

    return (
        <div>
            <MultipleAdd
                fieldDetails={fieldDetails}
                header='Add Stock Verification For'
                subheader='Add Stock Verification For'
                name={Actions.library_stock_verification_parent.view.label}
                viewUrl={Actions.library_stock_verification_parent.view.url}
                submitDisable={submitDisable}
                postMethod={postMethod}
                headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12, sm: 4 }}
                bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12, sm: 8 }}
                idFormat={'category_add_2022_08_11_3_pm_'}
            />
        </div>
    );
};

export default AddLibraryStockVerificationParent;
