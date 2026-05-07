/* eslint-disable react/jsx-key */
import React, { useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Box, Grid, Divider, Tooltip, IconButton, CircularProgress } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import AllMUIDataTable from "Components/AllMUIDataTable";
import NumberFormat from 'react-number-format';
import _ from 'lodash';
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import WarningIcon from '@material-ui/icons/Warning';
import { numberWithCommas, numberWithCommasWithoutSymbol, isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import InfoIcon from '@material-ui/icons/Info';
import PaymentIcon from '@material-ui/icons/Payment';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import commonMessages from 'Constants/messages';
import { Dropdown } from "Components/DropDown";
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { options } from 'Constants';

const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) ? JSON.parse(localStorage.getItem('fee_configurations')) : {}
const isEnabledSequence = fee_config?.['hide_fee_term_sequence'] ? fee_config?.['hide_fee_term_sequence'] == 1 ? false : true : true


const useStyles = makeStyles({
    expanded: {
        '&$expanded': {
            margin: '0px 0',
            height: '0px',
            backgroundColor: '#f8f8ff',
            borderBottom: '1px solid rgba(0,0,0,.125)'
        },
        minHeight: '60px'
    },
    root: {
        boxShadow: '0px 0px 4px rgba(0, 0, 0, 0.15)',
        marginBottom: '20px'
    }
});
function NumberFormatCustom(props) {
    const { inputRef, onChange, ...other } = props;

    return (
        <NumberFormat
            {...other}
            thousandsGroupStyle="lakh"
            thousandSeparator={true}
            getInputRef={inputRef}
            onValueChange={(values) => {
                onChange({
                    target: {
                        name: props.name,
                        value: values.value,
                    },
                });
            }}
            isNumericString
            prefix="₹ "
        />
    );
}

export default function CashBookSummary(props) {
    const { cashbookSummary, tableUpdating } = props;
    const columns=[
        {
            name: "fee_type_name",
            label: 'Fee Type',
            options: {
                filter: false,
                sort: false,
                search: false,
            },
        },
        {
            name: "amount",
            label: 'Amount',
            options: {
                filter: false,
                sort: false,
                search: false,
            },
        },
    ]

return (
    <div>
        <Grid container spacing={2}>
            <Grid item md={6} xs={12}>
                <AllMUIDataTable
                    key={cashbookSummary}
                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                    data={cashbookSummary}
                    columns={columns}
                    options={options}
                />
            </Grid>
            <Grid item md={6} xs={12}>
                <AllMUIDataTable
                    key={cashbookSummary}
                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                    data={cashbookSummary}
                    columns={columns}
                    options={options}
                />
            </Grid>
            {/* <Grid item md={4} xs={12}>
                    <AllMUIDataTable
                        key={cashbookSummary}
                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                        data={cashbookSummary}
                        columns={columns}
                        options={optionsLocal}
                        onTableChange={this.onTableChange}
                    />
                </Grid>
                <Grid item md={4} xs={12}>
                    <AllMUIDataTable
                        key={cashbookSummary}
                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                        data={cashbookSummary}
                        columns={columns}
                        options={optionsLocal}
                        onTableChange={this.onTableChange}
                    />
                </Grid> */}
        </Grid>
    </div>
);
}