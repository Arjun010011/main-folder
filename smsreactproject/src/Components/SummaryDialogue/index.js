import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Button, CircularProgress, Dialog } from '@material-ui/core';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Typography from '@material-ui/core/Typography';
import { getStandard, numberWithCommas } from 'Includes/functions';
import TextareaAutosize from '@material-ui/core/TextareaAutosize';
import './styles.scss';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';

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


export default function SummaryDialogue(props) {
    const [open, setOpen] = React.useState(true);
    const [body, setBody] = React.useState([]);
    const [particulars, setParticulars] = React.useState('');
    const [saveButtonDisabled, setSaveButtonDisabled] = React.useState(false);
    const [header, setHeader] = React.useState([]);
    const [title, setTitle] = React.useState('');
    const [listName, setListName] = React.useState('');
    const [listKeys, setListKeys] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [standardList, setStandardList] = React.useState([]);
    const [standard, setStandard] = React.useState('');
    const [error, setError] = React.useState({});

    const handleClose = () => {
        props.closeInParent();
    };


    const saveData = () => {
        if (props.isTCFee) {
            if (standard) {
                setSaveButtonDisabled(true);
                let data = { 'particulars': particulars, standard: standard };
                props.saveData(data);
            }
            else {
                let error = { standard: 'select standard' }
                setError(() => error)
            }
        }
        else {
            setSaveButtonDisabled(true);
            let data = { 'particulars': particulars, standard: standard };
            props.saveData(data);
        }
    }

    const textAreaChange = (e) => {
        setParticulars(e.target.value)
    }

    const getStandard = () => {
        let standardList = []
        let url = GET_URL.getmystandard.api
        let params = { is_active: true, tc_standards: 1, student: props.body.student }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                standardList = response.data.data
                setStandardList(() => standardList)
                setIsLoading(() => false)
            }
            // else{
            // setStandardList(() => [{id:1,name:'standard1'},{id:2,name:'stamdard 2'}])
            // }
            setIsLoading(() => false)
        })
    }

    const onChangeStandard = (e) => {
        let error = {}
        setError(() => error)
        setStandard(() => e.target.value)
    }

    React.useEffect(() => {
        setOpen(props.showSummaryDialogue);
        setBody(props.body);
        setHeader(props.header);
        setTitle(props.title);
        setListName(props.listName);
        setListKeys(props.listKeys);
        if (props.isTCFee) {
            setIsLoading(() => true)
            getStandard()
        }
    }, [props.showSummaryDialogue]);

    return (
        <div>
            {isLoading &&
                <div className='loading'>
                    <CircularProgress />
                </div>
            }
            {!isLoading &&
                <div>
                    {props.isTCFee &&
                        <div className=''>
                            <Dropdown
                                data={standardList}
                                name="standard"
                                value={standard}
                                hideSelect={true}
                                required={true}
                                onChange={(e) => onChangeStandard(e)}
                                label="Standard"
                                error={error.standard}
                                customId='standard'
                                customName='standard_name'
                            />
                        </div>
                    }
                    <Typography gutterBottom className='mt-20'>
                        <table className='w-100'>
                            <thead>
                                <tr className='thead-adjustment'>
                                    {header.map((data, index) => {
                                        return <th>{data}</th>
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {!!body[listName] &&
                                    body[listName].map((data, index) => {
                                        return <tr className='tbody-adjustment'>
                                            {listKeys.map((key, i) => {
                                                let value = data[key];
                                                if (key === 'amount') {
                                                    value = numberWithCommas(value);
                                                }
                                                return <td>{value}</td>
                                            })}
                                        </tr>
                                    })}
                                <tr className='tbody-adjustment row-text-bold'>
                                    <td>Total</td><td>{numberWithCommas(body['total_amount'])}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Typography>
                    <TextareaAutosize aria-label="minimum height" className='w-100 adjustment-textarea'
                        rowsMin={4} placeholder="Comments" maxLength={60}
                        onChange={textAreaChange} value={particulars}
                    />
                </div>
            }
        </div>
    );
}