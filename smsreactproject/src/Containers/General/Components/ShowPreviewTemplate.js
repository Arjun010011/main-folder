import React from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, Fab, } from '@material-ui/core';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'

export default function ShowPreviewTemplate(props) {
    const { formDetails, errorContent, handleSubmit, isSelectTemplate, submitDisable } = props;
    const [form_details, set_form_details] = React.useState({})
    const [templateList, set_templateList] = React.useState([])
    const [selected_template, set_selected_template] = React.useState('')
    const [local_error_content, set_local_error_content] = React.useState('')
    const [local_submit_disable, set_local_submit_disable] = React.useState(false)

    const submit = () => {
        handleSubmit(selected_template)
    }

    React.useEffect(() => {
        if (isSelectTemplate) {
            getTemplateList()
        }
        else {
            set_form_details(() => formDetails)
        }
    }, []);

    const handleChange = (e, value) => {
        let temp_details={
            title:value?.name,
            notification_medium:value?.notification_medium,
            notification_medium_name:value?.notification_medium_name,
            language:value?.language,
            lang_name:value?.language_name,
            message:value?.data,
        }
        set_form_details(()=> temp_details)
        set_selected_template(() => value)
    }

    const getTemplateList = () => {
        const url = GET_URL.notificationtemplate.api
        const params = { is_active: true }
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                set_templateList(() => response.data.data)
            }
        })
    }

    return (
        <div>
            <Dialog open={true}
                className='dialog-bulk-notification-select'
                aria-labelledby='form-dialog-title'>
                <DialogTitle>
                    Notification Template Preview
                </DialogTitle>
                <DialogContent>
                    {isSelectTemplate &&
                        <DropDownWithSearch
                        options={templateList}
                        name='selected_template'
                        value={selected_template}
                        onChange={handleChange}
                        label='Search Template'
                        customId='name'
                        hideSelect={true}
                        className='w-100'
                        />
                    }
                    {(selected_template || !isSelectTemplate) &&
                        <div className='fs-18 mt-20'>
                            <div>
                                <div className='opacity-7'>Notification Medium</div>
                                <div className='pl-20'>{form_details?.notification_medium_name}</div>
                            </div>
                            <div className='mt-10'>
                                <div className='opacity-7'>Selected language</div>
                                <div className='pl-20'>{form_details?.lang_name}</div>
                            </div>
                            <div className='mt-10'>
                                <div className='opacity-7'>Title</div>
                                <div className='pl-20'>{form_details?.title}</div>
                            </div>
                            <div className='mt-20 fs-15'>
                                <div className='opacity-7'>Message</div>
                                <div className='dangerous-style pl-20' dangerouslySetInnerHTML={{ __html: form_details?.message }}></div>
                            </div>
                            <div className='action-error-content flex-justify-center margin-top-10'>
                                {errorContent || local_error_content}
                            </div>
                        </div>
                    }
                </DialogContent>
                <DialogActions>
                    <Button onClick={props.handleDialogChange} color='secondary'>
                        Close
                    </Button>
                    <Button disabled={submitDisable || local_submit_disable} onClick={submit} color='primary'>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}