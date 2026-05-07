import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, TextField } from '@material-ui/core';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Typography from '@material-ui/core/Typography';
import WarningIcon from '@material-ui/icons/Warning';
import { numberWithCommas } from 'Includes/functions';
import { DropDownWithSearchAndAddApi } from 'Components/DropDownWithSearchAndAddApi';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
// import './styles.scss';
import { nameAndNumberAndHyphenRegex } from 'Constants/regularExpression'
import { minDate, reasonType } from 'Constants';
import { POST_URL, GET_URL, PUT_URL } from 'Includes/urls'
import { getRequest, putRequest } from 'Includes/api/apicall';
import Skeleton from '@material-ui/lab/Skeleton';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import Swal from 'sweetalert2'
import AttachFileIcon from '@material-ui/icons/AttachFile';
import GetAppIcon from '@material-ui/icons/GetApp';

const fieldDetails = [
    {
        label: 'Reason Name', regex: nameAndNumberAndHyphenRegex, autoFocus: false, name: 'name', md: 12, className: 'w-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50, gridClassName: "margin-vertical-20",
    },
]

const styles = (theme) => ({
    root: {
        margin: 0,
        padding: theme.spacing(2),
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
});

const DialogTitle = withStyles(styles)((props) => {
    const { children, classes, onClose, ...other } = props;
    return (
        <MuiDialogTitle disableTypography className={classes.root} {...other}>
            <Typography variant="h6">{children}</Typography>
            {onClose ? (
                <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            ) : null}
        </MuiDialogTitle>
    );
});

const DialogContent = withStyles((theme) => ({
    root: {
        padding: theme.spacing(2),
    },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
    root: {
        margin: 0,
        padding: theme.spacing(1),
    },
}))(MuiDialogActions);

const header = 'Approve Concession Amount';


const body = '';

export default function FeeAdjustmentApproval(props) {
    const [open, setOpen] = React.useState(true);
    const [body, setBody] = React.useState([]);
    const [discount, setDiscount] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [alertData, setAlertData] = React.useState('')
    const [snackbar, setSnackbar] = React.useState(false)
    const [reasonList, setReasonList] = React.useState([])
    const [totalAmountPaid, setTotalAmountPaid] = React.useState(0)
    const [deletableIds, setDeletableIds] = React.useState([])
    const [totalDeletedAmount, setTotalDeletedAmount] = React.useState(0)

    const handleClose = (updateRequired) => {
        props.closeInParent(updateRequired);
    };

    const handleCloseSnackBar = () => {
        setSnackbar(false)
    }

    React.useEffect(() => {
        if (props.parentIds) {
            setAlertData(() => '')
            setSnackbar(() => false)
            getAdjustmentList()
        }
    }, []);

    const [approvedDocuments, setApprovedDocuments] = React.useState([])

    const getAdjustmentList = () => {
        let get_url = GET_URL.adjustmentapprovalrequest.api
        let prop = {}
        prop['pagination'] = 0
        prop['ids'] = props.parentIds.join(',')
        prop['exclude_approval_status'] = '1'
        getRequest(get_url, prop, {}).then(response => {
            let tempList=[]
            let allDocuments = []
            response.data.data.map((data)=>{
                if(data.adjustment_fee_adjustment_fee_parent){
                    tempList=[...tempList,...data.adjustment_fee_adjustment_fee_parent]
                }
                // Collect approved documents
                if(data.approved_documents && data.approved_documents.length > 0){
                    allDocuments = [...allDocuments, ...data.approved_documents]
                }
            })
            setBody(tempList)
            setApprovedDocuments(allDocuments)
        })
    }

    const saveAdjustment = (status) => {
        let url = PUT_URL.adjustmentapprovalrequestupdate.api;
        let post_data = {
            adjsutment_parent_ids: props.parentIds,
            approval_status: status
        }
        let prop = { return_error_message: true }
        putRequest(url, post_data, prop).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                handleClose(true)
            }
            else {
                setAlertData(() => response)
                setSnackbar(() => true)
            }
        })
    }

    let totalAmountTemp = 0

    return (
        <div>
            <Dialog
                // onClose={handleClose}
                className='action-general-detail-width'
                aria-labelledby="customized-dialog-title" open={open}>
                <DialogTitle id="customized-dialog-title" onClose={handleClose}>
                    {header}
                    {props.adjustmentEnabled &&
                        <Box className="warning-msg">
                            <Box display="flex" className='warning-message fs-12' mt={2} ml={0}>
                                <WarningIcon style={{ color: '#f6c342' }} /> Adjustment Amount will increase/reduce the student fees. Please review before submit
                            </Box>
                        </Box>
                    }
                </DialogTitle>
                <DialogContent>
                    <table className='w-100'>
                        <thead>
                            <tr className='thead-adjustment'>
                                <th >Disount </th><th>Fee Type</th><th className='text-align-right'>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!!body &&
                                body.map((data, index) => {
                                    totalAmountTemp = data['is_addition'] ? totalAmountTemp + parseFloat(data['amount']) : totalAmountTemp - parseFloat(data['amount'])
                                    return <tr className='tbody-adjustment'>
                                        <td>{data?.['reason_name']}</td>
                                        <td>{data?.['fee_type_name']} ({data?.['fee_term_name']})</td>
                                        <td className='text-align-right'>{`(${data['is_addition'] ? '+' : '-'}) ${numberWithCommas(data['amount'])}`}</td>
                                    </tr>
                                })}
                            <tr className='tbody-adjustment row-text-bold'>
                                <td>Total</td>
                                <td></td>
                                <td className='text-align-right'>
                                    {numberWithCommas(totalAmountTemp)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    {/* Display Approved Documents */}
                    {approvedDocuments.length > 0 && (
                        <Box style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                            <Typography variant="subtitle2" style={{ marginBottom: '12px', fontWeight: 'bold' }}>
                                Approved Documents
                            </Typography>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {approvedDocuments.map((doc, index) => (
                                    <div
                                        key={doc.id || index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px',
                                            backgroundColor: 'white',
                                            borderRadius: '4px',
                                            border: '1px solid #e0e0e0'
                                        }}
                                    >
                                        <AttachFileIcon style={{ color: '#1976d2', fontSize: '20px' }} />
                                        <Typography variant="body2" style={{ flex: 1, fontSize: '12px' }}>
                                            {doc.file_name || 'Document'}
                                        </Typography>
                                        {doc.file && (
                                            <Button
                                                size="small"
                                                startIcon={<GetAppIcon />}
                                                onClick={() => window.open(doc.file, '_blank')}
                                                style={{ textTransform: 'none', fontSize: '11px' }}
                                            >
                                                View
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <div className='text-red'>
                        {alertData}
                    </div>
                    <Button
                        className='apply-leave-button'
                        onClick={e => saveAdjustment(1)}>Approve
                    </Button>
                    <Button
                        className='apply-leave-reset-button '
                        onClick={e => saveAdjustment(2)}>Reject
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={snackbar}
                autoHideDuration={10000}
                onClose={handleCloseSnackBar}
            >
                <Alert onClose={handleCloseSnackBar} severity="error">
                    {alertData}
                </Alert>
            </Snackbar>
        </div>
    );
}