import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

export default defineMessages({

libCategoryType: {
    id: 'src_Containers_libManagement_libCategoryType',
    defaultMessage: 'Library Category',
},
libCategoryTypeName: {
    id: 'src_Containers_libManagement_libCategoryTypeName',
    defaultMessage: 'Category Name',
},
libCategoryTypeCode: {
    id: 'src_Containers_libManagement_libCategoryTypeCode',
    defaultMessage: 'Category Code',
},
addCategorySubHeading: {
    id: 'src_Containers_libManagement_addCategorySubHeading',
    defaultMessage: 'All the type(s) of category can be added in this page. ex: School, PUC, General',
},
editlibCategoryType: {
    id: 'src_Containers_libManagement_editlibCategoryType',
    defaultMessage: 'Edit Category Type',
},

libSubCategoryType: {
    id: 'src_Containers_libManagement_libSubCategoryType',
    defaultMessage: 'Library Sub Category',
},
libSubCategoryTypeName: {
    id: 'src_Containers_libManagement_libSubCategoryTypeName',
    defaultMessage: 'Sub Category Name',
},
libSubCategoryTypeCode: {
    id: 'src_Containers_libManagement_libSubCategoryTypeCode',
    defaultMessage: 'Sub Category Code',
},
editlibSubCategoryType: {
    id: 'src_Containers_libManagement_editlibSubCategoryType',
    defaultMessage: 'Edit Sub Category Type',
},
editLibAuthors: {
    id: 'src_Containers_libManagement_editLibAuthors',
    defaultMessage: 'Edit Book Author',
},
editLibRacks: {
    id: 'src_Containers_libManagement_editLibRacks',
    defaultMessage: 'Edit Book Rack',
},
addSubCategorySubHeading: {
    id: 'src_Containers_libManagement_addSubCategorySubHeading',
    defaultMessage: `All the type(s) of sub category can be added in this page. ex: Science, General or Any Particular Standard`,
},
subCategoryBlankScreenView: {
    id: 'src_Containers_libManagement_subCategoryBlankScreenView',
    defaultMessage: 'Select The Category',
},
libSubCategoryAlertMessage: {
    id: 'src_Containers_libManagement_libSubCategoryAlertMessage',
    defaultMessage: 'Select the Category',
},
libCategorySelectCategory: {
    id: 'src_Containers_libManagement_libCategorySelectCategory',
    defaultMessage: 'Category',
},
libSubCategorySelectCategory: {
    id: 'src_Containers_libManagement_libSubCategorySelectCategory',
    defaultMessage: 'Sub Category',
},

libAuthors: {
    id: 'src_Containers_libManagement_libAuthors',
    defaultMessage: 'Book Authors',
},

libRacks: {
    id: 'src_Containers_libManagement_libRacks',
    defaultMessage: 'Book Racks',
},

libTotalBooks: {
    id: 'src_Containers_libManagement_libTotalBooks',
    defaultMessage: 'Total Books',
},
libAvailableBooks: {
    id: 'src_Containers_libManagement_libAvailableBooks',
    defaultMessage: 'Available Books',
},

libBooks: {
    id: 'src_Containers_libManagement_libBooks',
    defaultMessage: 'Library Book',
},

libNoOfCopies: {
    id: 'src_Containers_libManagement_libNoOfCopies',
    defaultMessage: 'No. Of Copies',
},

libPublisher: {
    id: 'src_Containers_libManagement_libPublisher',
    defaultMessage: 'Book Publisher',
},

libconfiguration: {
    id: 'src_Containers_libManagement_libconfiguration',
    defaultMessage: 'Library Configuration',
},

returnWithinDays: {
    id: 'src_Containers_libManagement_returnWithinDays',
    defaultMessage: 'Return Within Days',
},

numberOfBooksPerUser: {
    id: 'src_Containers_libManagement_numberOfBooksPerUser',
    defaultMessage: 'Number Of Books Per User',
},
fineAmount: {
    id: 'src_Containers_libManagement_fineAmount',
    defaultMessage: 'Fine Amount',
},
fineFreqInMin: {
    id: 'src_Containers_libManagement_fineFreqInMin',
    defaultMessage: 'Fine Frequency In Minutes',
},
maxFineAmount: {
    id: 'src_Containers_libManagement_maxFineAmount',
    defaultMessage: 'Max Fine Amount',
},

isDefault: {
    id: 'src_Containers_libManagement_isDefault',
    defaultMessage: 'Is Default',
},
vendorName:{
    id: 'src_Containers_libManagement_vendorName',
    defaultMessage: 'Vendor Name',
},
vendorAddress:{
    id: 'src_Containers_libManagement_vendorAddress',
    defaultMessage: 'Vendor Address',
},
vendorHeader: {
    id: 'src_Containers_libManagement_vendorHeader',
    defaultMessage: 'Vendor List',
},
vendorSubHeading: {
    id: 'src_Containers_libManagement_vendorSubHeading',
    defaultMessage: 'All the type(s) of Vendor can be added in this page. ex: Ganapati Stores, #123, JP Nagar Bangalore',
},
})