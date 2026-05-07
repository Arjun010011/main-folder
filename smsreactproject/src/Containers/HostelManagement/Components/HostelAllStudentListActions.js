import React, { useEffect } from 'react';
import {
    IconButton, Menu, MenuItem, Tooltip, Dialog, DialogActions, DialogContent, FormControl, TextareaAutosize,
    Button, Box, TextField,FormHelperText
} from '@material-ui/core';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import { withRouter } from 'react-router-dom'
import { postRequest} from 'Includes/api/apicall';
import { NumberFormatCustom, dateFormat } from 'Includes/functions';
import { numberRegex } from 'Constants/regularExpression';
import { POST_URL } from 'Includes/urls'; 
import Swal from 'sweetalert2'

const ITEM_HEIGHT = 35;

function StudentListActions(props) {

    const { id,index, viewURL, roomUrl, enabledActions, viewExtraParams ,updateParentUpdate} = props; 
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [displayActions, setDisplayActions] = React.useState(false);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [updateDisable, setUpdateDisable] = React.useState(false);
    const [showData, setShowData] = React.useState('');
    const [withdrawAmount, setWithdrawAmount] = React.useState('');
    const [reason, setReason] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [transactionId, setTransactionId] = React.useState('');
    let [enabledActionsNew, setEnabledAction] = React.useState('');

    const openMenu = Boolean(anchorEl);


    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleView = () => {
        let { viewExtraParams } = props;
        props.history.push({
            pathname: viewURL,
            state: { detail: id, ...viewExtraParams }
        })
    }

    const handleRoomHistory = () => {
        props.history.push({
            pathname: roomUrl,
            state: { detail: id, ...viewExtraParams }
        })
    }

    const handleWithdraw = () => {
        setIsDialogOpen(() => true)
        handleCloseMenu()
    }

    useEffect(() => {
        if (enabledActions.length > 0) {
            let showData
            if (enabledActions.length > 1) {
                enabledActionsNew = enabledActions
                showData = enabledActions.join('/ ');
            }
            else {
                enabledActionsNew = enabledActions
                showData = enabledActions.join()
            }
            setShowData(showData)
            setDisplayActions(true)
            setEnabledAction(enabledActionsNew)
            setTransactionId(()=>Date.now())

        }
    }, [showData])

    const handleClose = () => {
        setIsDialogOpen(() => false)
        setWithdrawAmount(() => '')
        setReason(() => '')
    }

    const handleAmountChange = (e) => {
        let { value } = e.target;
        if (numberRegex.value.test(value)) {
            setWithdrawAmount(() => value)
            if (viewExtraParams.balance < value) {
                let fieldError = { withdraw: 'Enter below balance amount' }
                setFieldError(() => fieldError)
                setUpdateDisable(() => true)
            }
            else {
                let fieldError = {}
                setFieldError(() => fieldError)
                setUpdateDisable(() => false)
            }
        }
    }

    const handleReasonChange = (e) => {
        let { value } = e.target;
        setReason(() => value)
    } 

    const validateAndPostData=()=>{
        if(!withdrawAmount){
            let fieldError = { withdraw: 'Enter return amount' }
            setFieldError(() => fieldError)
            return false
        }
        let post_data = {
            amount: parseFloat(withdrawAmount),
            description: reason,
            student_list: [viewExtraParams.student],
            transaction_id: transactionId
        }
        return post_data
    }

    const onSubmit = () => {
        let validate_post_data=validateAndPostData()
        if (validate_post_data) { 
            setUpdateDisable(()=>true)
            let url=POST_URL.returnback.api
            postRequest(url, validate_post_data, props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        handleClose()
                        updateParentUpdate(withdrawAmount,index)
                    }
                    setUpdateDisable(()=>false)
                });

        }
    }

    return (
        <div>
            <Tooltip title={showData} enterDelay={400}
                enterNextDelay={400} placement='top-start'
                classes={{ tooltip: 'tooltip-show-data' }}>
                <IconButton
                    aria-label="more"
                    aria-controls="long-menu"
                    aria-haspopup="true"
                    onClick={handleClick}
                    className={displayActions ? 'padding-0' : 'display-none'}
                >
                    <MoreHorizIcon />
                </IconButton>
            </Tooltip>
            <Menu
                id="long-menu"
                anchorEl={anchorEl}
                keepMounted
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{ 
                    style: {
                        maxHeight: ITEM_HEIGHT * 7,
                        width: 200,
                    },
                }}
            >
                {enabledActionsNew.includes('Transactions') && <MenuItem onClick={handleView}>
                    Transactions
                </MenuItem>}
                {enabledActionsNew.includes('Room History') && <MenuItem onClick={handleRoomHistory}>
                    Room History
                </MenuItem>}
                {enabledActionsNew.includes('Return Back') && <MenuItem onClick={handleWithdraw}>
                    Return Back
                </MenuItem>}
            </Menu>
            <Dialog open={isDialogOpen}
                className={'action-basic-detail-width'}
                // onClose={handleClose} 
                aria-labelledby='form-dialog-title'>
                <DialogContent>
                    <div className='fs-18 text-blue text-align-center'>
                        {`Enter Return Back amount`}
                    </div>
                    <Box className='fs-14 padding-y-20'>
                        <Box className='display-flex'>
                            <Box className='hostel-student-label'>Student Name</Box>
                            <Box className='hostel-student-value'>{viewExtraParams.name}</Box>
                        </Box>
                        <Box className='display-flex'>
                            <Box className='hostel-student-label'>Balance</Box>
                            <Box className='hostel-student-value'>{`₹ ${viewExtraParams.balance}`}</Box>
                        </Box>
                    </Box>
                    <Box>
                        <TextField
                            InputProps={{
                                inputComponent: NumberFormatCustom,
                            }}
                            autoComplete="off"
                            id={'amount'}
                            // type='number'
                            label={"Return Amount"}
                            name={'withdrawAmount'}
                            value={withdrawAmount}
                            className={'w-100'}
                            autoFocus={true}
                            variant='outlined'
                            required={true}
                            helperText={fieldError['withdraw'] && fieldError['withdraw']}
                            error={fieldError['withdraw'] ? true : false}
                            onChange={(e) => handleAmountChange(e)}
                            inputProps={{ maxLength: 10, style: { textAlign: 'right' } }}
                        />
                    </Box>
                    <FormControl
                        fullWidth
                        error={fieldError.reason && (fieldError.reason ? true : false)}
                    >
                        <Box className='leave-pending-staff-label'>Reason</Box>
                        <TextareaAutosize aria-label="minimum height"
                            className='apply-leave-text-area-auto-size-reason'
                            value={reason}
                            name='reason'
                            onChange={(e) => handleReasonChange(e)}
                            required
                        />
                        {fieldError.reason &&
                            <FormHelperText>{fieldError.reason}</FormHelperText>
                        }
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color='secondary'>
                        Close
                    </Button>
                    <Button disabled={updateDisable} onClick={onSubmit} color='primary'>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </div >
    );
}
export default withRouter(StudentListActions)