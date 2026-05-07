import React, { useRef } from 'react';
import GurukulaFeeReciept from 'Containers/Invoices/GurukulaFeeReciept';
import GurukulaMiscReciept from 'Containers/Invoices/GurukulaMiscReciept';
import {getTemplateComponent} from 'Includes/functions';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import LoadingGif from 'Components/LoadingGif';

export default function InvoiceSelection(props) {
  const [temp, setTemp] = React.useState(<LoadingGif />);

  const getInvoiceTemplate = (invoiceData) => {
    getTemplateComponent(props.invoiceSelect).then((result)=>{
      if( !result ){
        setTemp(<BlankPagewithIcon data={'Template Mapping Not found for '+props.invoiceSelect } />)
      }else{
        setTemp(React.cloneElement(
          result,
          {invoiceData: invoiceData}
        ))
      }
    })
  }

  React.useEffect(() => {
    getInvoiceTemplate(props.invoiceData)
  }, [props.invoiceData]);

  return (
    <div>
      {temp}
    </div>
  );
}