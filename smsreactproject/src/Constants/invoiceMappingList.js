import React from 'react';
import GurukulaFeeReciept from 'Containers/Invoices/GurukulaFeeReciept';
import GurukulaMiscReciept from 'Containers/Invoices/GurukulaMiscReciept';
import GurukulaFeeReciept1 from 'Containers/Invoices/GurukulaFeeReciept1';
import GurukulaMiscReciept1 from 'Containers/Invoices/GurukulaMiscReciept1';
import StudyCertificateDefault from 'Containers/Invoices/StudyCertificateDefault';
import StudyCertificateSadguru from 'Containers/Invoices/StudyCertificateSadguru';

export const INVOICE_MAPPING = [{
	"name": "fee_collection_default",
	"description": "Fee collection Reciept prints for all the Institute.",
	"template_type": "html",
	"module": "fee_collection",
    "component": <GurukulaFeeReciept />,
	"printertype": "regular",
    "isdefault": true
},
{
	"name": "gurukula_fee_collection",
	"description": "Fee collection Reciept prints for all the Institute.",
	"template_type": "html",
	"module": "fee_collection",
    "component": <GurukulaFeeReciept1 />,
	"printertype": "regular",
    "isdefault": false
}
,{
	"name": "misc_reciept_default",
	"description": "Misc ",
	"template_type": "html",
	"module": "misc_reciept",
    "component": <GurukulaMiscReciept />,
	"printertype": "regular",
    "isdefault": true
},
{
	"name": "misc_gurukula_reciept",
	"description": "Misc ",
	"template_type": "html",
	"module": "misc_reciept",
    "component": <GurukulaMiscReciept1 />,
	"printertype": "regular",
    "isdefault": false
},
{
	"name": "fee_certificate_default",
	"description": "Fee certificate Reciept prints for all the Institute.",
	"template_type": "html",
	"module": "fee_certificate",
    "component": <StudyCertificateDefault />,
	"printertype": "regular",
    "isdefault": true
},
{
	"name": "fee_certificate_sadguru",
	"description": "Fee certificate Reciept prints for all the Institute.",
	"template_type": "html",
	"module": "fee_certificate",
    "component": <StudyCertificateSadguru />,
	"printertype": "regular",
    "isdefault": false
},
]
