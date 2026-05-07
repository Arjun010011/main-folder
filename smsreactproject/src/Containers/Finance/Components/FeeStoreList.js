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
import { getPaginationProps, numberWithCommas ,getPropertyValues} from 'Includes/functions';
import { DropDownWithSearchAndAddApi } from 'Components/DropDownWithSearchAndAddApi';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
// import './styles.scss';
import { nameAndNumberAndHyphenRegex } from 'Constants/regularExpression'
import { minDate, reasonType } from 'Constants';
import { POST_URL, GET_URL } from 'Includes/urls'
import { getRequest } from 'Includes/api/apicall';
import Skeleton from '@material-ui/lab/Skeleton';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';

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

const header = 'Store List';


const body = '';

export default function FeeStoreList(props) {
    const [open, setOpen] = React.useState(true);
    const [body, setBody] = React.useState([]);
    const [alertData, setAlertData] = React.useState('')
    const [snackbar, setSnackbar] = React.useState(false)
    const [totalAmountPaid, setTotalAmountPaid] = React.useState(0)

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

    let totalAmountTemp = 0
    let totalOpted = 0
    let totalIssued = 0

    return (
        <div>
            <Dialog
                // onClose={handleClose}
                className='action-marks-modal-width'
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
                                <th >Item Name </th>
                                <th >Property Values </th>
                                <th >Assigned Quantity</th>
                                <th >Issued Quantity</th>
                                <th className='text-align-right'>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!!body &&
                                body.map((data, index) => {
                                    totalAmountTemp = totalAmountTemp + parseFloat(data['assigned_quantity_total_price'])
                                    totalOpted+=parseInt(data?.['assigned_quantity'])
                                    totalIssued+=parseInt(data?.['issued_quantity'])
                                    return <tr className='tbody-adjustment'>
                                        <td>{data?.['item_name']}</td>
                                        <td>{getPropertyValues(data?.property_values)}</td>
                                        <td>{data?.['assigned_quantity']}</td>
                                        <td>{data?.['issued_quantity']}</td>
                                        <td className='text-align-right'>
                                            {`${numberWithCommas(data['assigned_quantity_total_price'])}`}</td>
                                    </tr>
                                })}
                            <tr className='tbody-adjustment row-text-bold'>
                                <td>Total</td>
                                <td></td>
                                <td>{totalOpted}</td>
                                <td>{totalIssued}</td>
                                <td className='text-align-right'>
                                    {numberWithCommas(totalAmountTemp)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </DialogContent>
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