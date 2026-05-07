import React from "react";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { Paper, Box} from '@material-ui/core';
import { numberWithCommas } from 'Includes/functions';

export default function ConcessionInvoiceView(props) {
    const [invoiceData, setInvoiceData] = React.useState([]);
    const [invoiceFields, setInvoiceFields] = React.useState([]);
    const [summary, setSummary] = React.useState([]);

    React.useEffect(() => {
        let tempData = props.invoiceData;
        let tempSummary = props.summary;
        let summary = [];
        let invoiceData = [];
        let totalAmountMapping = {};
        let count = 0;
        tempData.map((data, index) => {
            data['standard_fee'].map((termData) => {
                if( parseInt(termData.applied_concession) > 0 ){
                    termData['fee_type_name'] = data['fee_type_name'];
                    count++;
                    tempSummary.map((summaryData)=>{
                        if( summaryData['type'] === 'total' ){
                            if( !(summaryData['key_to_sum'] in totalAmountMapping) ){
                                totalAmountMapping[summaryData['key_to_sum']] = 0;
                            }
                            totalAmountMapping[summaryData['key_to_sum']] += parseFloat(termData[summaryData['key_to_sum']]);
                        }
                    });
                    invoiceData.push(termData)
                }
            })
        })
        if( count > 0 ){
            tempSummary.map((summaryData)=>{
                if( summaryData['type'] === 'label' ){
                    summary.push(summaryData['label'])
                }else if( summaryData['type'] === 'total' ){
                    if( summaryData['key_to_sum'] in totalAmountMapping ){
                        summary.push(numberWithCommas(totalAmountMapping[summaryData['key_to_sum']]))
                    }else{
                        summary.push(0)
                    }
                }
            })
        }
        setSummary(summary)
        setInvoiceData(invoiceData)
        if( invoiceFields.length === 0 ){
            setInvoiceFields(props.invoiceFields)
        }
    }, [props.invoiceData]);

    return (
        <div>
            { invoiceData.length > 0 &&
                <>
                <Box className='invoice-heading'>
                    Invoice 
                </Box>
                <TableContainer component={Paper}>
                    <Table className='' aria-label="Invoice table">
                        <TableHead>
                            <TableRow style={{backgroundColor:'#CADFF0'}}>
                                {
                                    invoiceFields.map((field, iIndex)=>{
                                        return  <TableCell key={iIndex}>
                                                    {field.name}
                                                </TableCell>
                                    })
                                }
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {invoiceData.map((invoice, index) => (
                            <TableRow key={index+'invoice'} style ={ index % 2? { background : "#F5F5F5" }:{ background : "white" }}>
                            {   invoiceFields.map((field, rowIndex)=>{
                                    if( field.key in invoice){
                                        return <TableCell component="th" scope="row" key={rowIndex+'rowIndex'}>
                                            {(field.is_amount) ? numberWithCommas(invoice[field.key]) : invoice[field.key]}
                                        </TableCell>
                                    }
                                })
                            }
                            </TableRow>
                        ))}
                        <TableRow>
                        {
                            summary.map((data, index)=>{
                                return  <TableCell key={index}>
                                            <span className='font-weight-bold'>{data}</span>
                                        </TableCell>
                                })
                        }
                        </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
                </>
            }
        </div>
    );
}