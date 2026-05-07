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
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
// import './styles.scss';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';

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

const header = 'Adjustment History';


const body = '';

export default function FeeAdjustmentList(props) {
    const [open, setOpen] = React.useState(true);
    const [body, setBody] = React.useState([]);
    const [reasonForAdjustment, setreasonForAdjustment] = React.useState('');
    const [discount, setDiscount] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [alertData, setAlertData] = React.useState('')
    const [snackbar, setSnackbar] = React.useState(false)
    const [reasonList, setReasonList] = React.useState([])
    const [reasonForAdjustmentError, setreasonForAdjustmentError] = React.useState(false)
    const [reasonLoading, setReasonLoading] = React.useState(false)
    const [totalAmountPaid, setTotalAmountPaid] = React.useState(0)
    const [deletableIds, setDeletableIds] = React.useState([])
    const [totalDeletedAmount, setTotalDeletedAmount] = React.useState(0)

    const handleClose = () => {
        props.closeInParent();
    };

    const handleCloseSnackBar = () => {
        setSnackbar(false)
    }

    React.useEffect(() => {
        let tempList = props.discountList
        setBody(tempList)
        setTotalAmountPaid(props.totalAmountPaid)
    }, [props.discountList, props.totalAmountPaid]);

    const handleSearchChange = (e) => {
        const { value } = e.target;
        setDiscount(() => value)
    }

    const saveAdjustment = (totalAmount) => {
        let data = { 'total_adjustment': totalAmount, 'deletable_ids': deletableIds, 'adjustment_list': body };
        props.saveAdjustment(data);
    }

    const handleDeleteDiscount = (index, data) => {
        let total_temp = totalDeletedAmount
        total_temp = (data['is_addition'] ? total_temp + parseFloat(data['amount']) : total_temp - parseFloat(data['amount']))
        setTotalDeletedAmount(() => total_temp)
        let deletableIds_temp = [...deletableIds]
        deletableIds_temp.push(data['id'])
        setDeletableIds(() => deletableIds_temp)
        let body_temp = [...body]
        body_temp.splice(index, 1)
        setBody(() => body_temp)
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
                                <th >Disount </th><th className='text-align-right'>Amount</th>
                                {props.adjustmentEnabled &&
                                    <th className='text-align-center'>Action </th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            {!!body &&
                                body.map((data, index) => {
                                    totalAmountTemp = data['is_addition'] ? totalAmountTemp + parseFloat(data['amount']) : totalAmountTemp - parseFloat(data['amount'])
                                    return <tr className='tbody-adjustment'>
                                        <td>{data?.['reason_id__name']}</td>
                                        <td className='text-align-right'>{`(${data['is_addition'] ? '+' : '-'}) ${numberWithCommas(data['amount'])}`}</td>
                                        {props.adjustmentEnabled &&
                                            <td className='text-align-center'>
                                                <DeleteOutlineIcon onClick={() => handleDeleteDiscount(index, data)} className='text-red height-width-25px pointer' />
                                            </td>
                                        }
                                    </tr>
                                })}
                            <tr className='tbody-adjustment row-text-bold'>
                                <td>Total</td><td className='text-align-right'>
                                    {numberWithCommas(totalAmountTemp)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </DialogContent>
                {props.adjustmentEnabled &&
                    <DialogActions>
                        <Button autoFocus onClick={() => saveAdjustment(totalAmountTemp)} color="primary" disabled={props.saveButtonBlocked}>
                            Save
                        </Button>
                    </DialogActions>
                }
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