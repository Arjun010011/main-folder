import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

export default defineMessages({
    storeCategoryType: {
        id: 'src_Containers_StoreManagement_storeCategoryType',
        defaultMessage: 'Category Type',
    },
    storeCategoryTypeName: {
        id: 'src_Containers_StoreManagement_storeCategoryTypeName',
        defaultMessage: 'Category Name',
    },
    storeCategoryTypeCode: {
        id: 'src_Containers_StoreManagement_storeCategoryTypeCode',
        defaultMessage: 'Category Code',
    },
    addCategorySubHeading: {
        id: 'src_Containers_StoreManagement_addCategorySubHeading',
        defaultMessage: 'All the type(s) of category can be added in this page. ex: Uniform, Electronics',
    },
    editStoreCategoryType: {
        id: 'src_Containers_StoreManagement_editStoreCategoryType',
        defaultMessage: 'Edit Category Type',
    },

    storeSubCategoryType: {
        id: 'src_Containers_StoreManagement_storeSubCategoryType',
        defaultMessage: 'Sub Category Type',
    },
    storeSubCategoryTypeName: {
        id: 'src_Containers_StoreManagement_storeSubCategoryTypeName',
        defaultMessage: 'Sub Category Name',
    },
    storeSubCategoryTypeCode: {
        id: 'src_Containers_StoreManagement_storeSubCategoryTypeCode',
        defaultMessage: 'Sub Category Code',
    },
    editStoreSubCategoryType: {
        id: 'src_Containers_StoreManagement_editStoreSubCategoryType',
        defaultMessage: 'Edit Sub Category Type',
    },
    addSubCategorySubHeading: {
        id: 'src_Containers_StoreManagement_addSubCategorySubHeading',
        defaultMessage: `All the type(s) of sub category can be added in this page. ex: For Uniform- ${alias_names['school']} Uniform, Sports Uniform`,
    },
    subCategoryBlankScreenView: {
        id: 'src_Containers_StoreManagement_subCategoryBlankScreenView',
        defaultMessage: 'Select The Category',
    },
    storeSubCategoryAlertMessage: {
        id: 'src_Containers_StoreManagement_storeSubCategoryAlertMessage',
        defaultMessage: 'Select the Category',
    },
    storeCategorySelectCategory: {
        id: 'src_Containers_StoreManagement_storeCategorySelectCategory',
        defaultMessage: 'Category',
    },

    storeProperty: {
        id: 'src_Containers_StoreManagement_storeProperty',
        defaultMessage: 'Property Types',
    },
    editStoreProperty: {
        id: 'src_Containers_StoreManagement_editStoreProperty',
        defaultMessage: 'Edit Property Type',
    },
    addPropertyHeading: {
        id: 'src_Containers_StoreManagement_addPropertyHeading',
        defaultMessage: 'Property Types',
    },
    addPropertySubHeading: {
        id: 'src_Containers_StoreManagement_addPropertySubHeading',
        defaultMessage: 'All the type(s) of property can be added in this page. ex: Color, Size',
    },

    storePropertyValue: {
        id: 'src_Containers_StoreManagement_storePropertyValue',
        defaultMessage: 'Property Value',
    },
    editStorePropertyValue: {
        id: 'src_Containers_StoreManagement_editStorePropertyValue',
        defaultMessage: 'Edit Property Value',
    },
    addPropertyValueHeading: {
        id: 'src_Containers_StoreManagement_addPropertyValueHeading',
        defaultMessage: 'Add Property Value',
    },
    addPropertyValueSubHeading: {
        id: 'src_Containers_StoreManagement_addPropertyValueSubHeading',
        defaultMessage: 'All the type(s) of property value can be added in this page. ex: For Color: Red, Blue',
    },
    PropertyValueBlankScreenView: {
        id: 'src_Containers_StoreManagement_PropertyValueBlankScreenView',
        defaultMessage: 'Select the property type to view the property value list',
    },
    storePropertyValueAlertMessage: {
        id: 'src_Containers_StoreManagement_storePropertyValueAlertMessage',
        defaultMessage: 'Select the Property Type',
    },
    storePropertyTypeSelectCategory: {
        id: 'src_Containers_StoreManagement_storePropertyTypeSelectCategory',
        defaultMessage: 'Property Type',
    },

    storeItem: {
        id: 'src_Containers_StoreManagement_storeItem',
        defaultMessage: 'Item',
    },
    storeViewItemHeading: {
        id: 'src_Containers_StoreManagement_storeViewItemHeading',
        defaultMessage: 'Item List',
    },
    storeItemName: {
        id: 'src_Containers_StoreManagement_storeItemName',
        defaultMessage: 'Item Name',
    },
    storeItemCode: {
        id: 'src_Containers_StoreManagement_storeItemCode',
        defaultMessage: 'Item Code',
    },
    editStoreItem: {
        id: 'src_Containers_StoreManagement_editStoreItem',
        defaultMessage: 'Edit Item',
    },
    addItemHeading: {
        id: 'src_Containers_StoreManagement_addItemHeading',
        defaultMessage: 'Add Item',
    },
    addItemSubHeading: {
        id: 'src_Containers_StoreManagement_addItemSubHeading',
        defaultMessage: 'All the type(s) of Item can be added in this page. ex: Shirt, Pant, T-Shirt',
    },

    storeViewStockItemHeading: {
        id: 'src_Containers_StoreManagement_storeViewStockItemHeading',
        defaultMessage: 'Stock Item List',
    },
    storeSubCategorySelectCategory: {
        id: 'src_Containers_StoreManagement_storeSubCategorySelectCategory',
        defaultMessage: 'Sub Category',
    },
    storeOpeningStock: {
        id: 'src_Containers_StoreManagement_storeOpeningStock',
        defaultMessage: 'Opening Stock',
    },
    storeAvailableStock: {
        id: 'src_Containers_StoreManagement_storeAvailableStock',
        defaultMessage: 'Available Stock',
    },

    storeVendorHeader: {
        id: 'src_Containers_StoreManagement_storeVendorHeader',
        defaultMessage: 'Vendor List',
    },
    storeVendorName: {
        id: 'src_Containers_StoreManagement_storeVendorName',
        defaultMessage: 'Vendor Name',
    },
    storeVendorAddress: {
        id: 'src_Containers_StoreManagement_storeVendorAddress',
        defaultMessage: 'Vendor Address',
    },
    editStoreVendor: {
        id: 'src_Containers_StoreManagement_editStoreVendor',
        defaultMessage: 'Edit Vendor Details',
    },
    addVendorHeading: {
        id: 'src_Containers_StoreManagement_addVendorHeading',
        defaultMessage: 'Vendor',
    },
    addVendorSubHeading: {
        id: 'src_Containers_StoreManagement_addVendorSubHeading',
        defaultMessage: 'All the type(s) of Vendor can be added in this page. ex: Ganapati Stores, #123, JP Nagar Bangalore',
    },

    addStockItemHeading: {
        id: 'src_Containers_StoreManagement_addStockItemHeading',
        defaultMessage: 'Add Stock Item',
    },
    storeSelectQuantity: {
        id: 'src_Containers_StoreManagement_storeSelectQuantity',
        defaultMessage: 'Quantity',
    },
    storeOpeningStockLabel: {
        id: 'src_Containers_StoreManagement_storeOpeningStockLabel',
        defaultMessage: 'Opening Stock',
    },
    storeCurrentSellingPrice: {
        id: 'src_Containers_StoreManagement_storeCurrentSellingPrice',
        defaultMessage: 'Current Price',
    },
    storeAlertMinStockLabel: {
        id: 'src_Containers_StoreManagement_storeAlertMinStockLabel',
        defaultMessage: 'Alert For Min Stock',
    },
    storeMinStockLabel: {
        id: 'src_Containers_StoreManagement_storeMinStockLabel',
        defaultMessage: 'Minimum Stock',
    },
    storeSelectValue: {
        id: 'src_Containers_StoreManagement_storeSelectValue',
        defaultMessage: 'Select Value',
    },
    storeSelectProperty: {
        id: 'src_Containers_StoreManagement_storeSelectProperty',
        defaultMessage: 'Select Property',
    },
    storeAddItemLabel: {
        id: 'src_Containers_StoreManagement_storeAddItemLabel',
        defaultMessage: 'Add Item',
    },
    storeChangeItemLabel: {
        id: 'src_Containers_StoreManagement_storeChangeItemLabel',
        defaultMessage: 'Change Item',
    },
    storeAddProperties: {
        id: 'src_Containers_StoreManagement_storeAddProperties',
        defaultMessage: 'Add Properties',
    },

    storeVendorName: {
        id: 'src_Containers_StoreManagement_storeVendorName',
        defaultMessage: 'Vendor Name',
    },
    storePurchaseViewHeader: {
        id: 'src_Containers_StoreManagement_storePurchaseViewHeader',
        defaultMessage: 'Purchase List',
    },
    storePropertyValues: {
        id: 'src_Containers_StoreManagement_storePropertyValues',
        defaultMessage: 'Property Values',
    },
    storeVoucherNum: {
        id: 'src_Containers_StoreManagement_storeVoucherNum',
        defaultMessage: 'Voucher Number',
    },
    addPurchaseHeading: {
        id: 'src_Containers_StoreManagement_addPurchaseHeading',
        defaultMessage: 'Purchase',
    },
    storePurchaseDate: {
        id: 'src_Containers_StoreManagement_storePurchaseDate',
        defaultMessage: 'Purchase Date',
    },
    selectCategoryGetResult: {
        id: 'src_Containers_StoreManagement_PropertyValueBlankScreenView',
        defaultMessage: 'Select category and expect a result',
    },

});