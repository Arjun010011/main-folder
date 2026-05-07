import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, Slide, Grid, AppBar, Toolbar, Typography, IconButton, CircularProgress, DialogContent, DialogContentText, DialogTitle, } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import Tooltip from "@material-ui/core/Tooltip";
import { MuiPickersUtilsProvider, KeyboardDateTimePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import _ from 'lodash';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import { checkLocalAcademicYear, Alert, SetAcademicYear, getPaginationProps, validateDate, dateFormat } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { TrendingUpTwoTone } from '@material-ui/icons';
import { DEFAULT_PAGINATION_PROPS, maxDate, minDate } from 'Constants';
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import messages from './../messages';
import Chip from '@material-ui/core/Chip';

const { forwardRef, useRef, useImperativeHandle } = React;


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));


const AddStockItemStore = forwardRef((props, ref) => {

    const [open, setOpen] = React.useState(false);
    const [categoryList, setCategoryList] = React.useState([]);
    const [subCategoryList, setSubCategoryList] = React.useState([]);
    const [category, setCategory] = React.useState('all');
    const [subCategory, setSubCategory] = React.useState('all');
    const [itemList, setItemList] = React.useState(null);
    const [pagination, setPagination] = React.useState(DEFAULT_PAGINATION_PROPS);
    const [blankData, setBlankData] = React.useState('Select Category');
    const [tableUpdating, setTableUpdating] = React.useState(false);
    const [openSnackBar, setOpenSnackBar] = React.useState(false);
    const [isSubCategory, setIsSubCategory] = React.useState(false);
    const [errorContent, setErrorContent] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [selectedItems, setSelectedItems] = React.useState([]);


    const [pageLoading, setPageLoading] = React.useState(true);

    const classes = useStyles();
    useImperativeHandle(
        ref,
        () => ({
            openModal() {
                getCategoryList()
                getStockList()
                setOpen(true);
                setSelectedItems(props.selectedItems?props.selectedItems: [])
            }
        }),
    )

    const setID = (value) => {
        let returnValue = {}
        returnValue['category_name'] = value[0]
        returnValue['sub_category_name'] = value[1]
        returnValue['item_name'] = value[2]
        returnValue['item_code'] = value[3]
        returnValue['property_values'] = value[4]
        returnValue['category'] = value[9]
        returnValue['sub_category'] = value[10]
        returnValue['item'] = value[11]
        returnValue['property_value'] = value[12]
        returnValue['id'] = value[8]
        returnValue['current_selling_price'] = value[7]
        returnValue['quantity'] = 1
        setSelectedItems(prev => {
            const isAlreadySelected = prev.some(item => item.id === returnValue.id);
            if (!isAlreadySelected) {
                return [...prev, returnValue];
            }
            return prev;
        });
        // props.selectedItem(returnValue)
        // setOpen(false);
    }

    const addSelectedItem = () => {
        props.selectedItem(selectedItems)
        setOpen(false);
    }

    const handleClose = () => {
        setOpen(false);
    };


    const getCategoryList = () => {
        const url = GET_URL.storecategory.api
        const params = { is_active: 1 }
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                response.data.data.unshift({ id: 'all', name: "All" })
                setCategoryList(response.data.data)
                setPageLoading(false)
            }
        })
    }

    const getStockList = (paginationProps) => {
        setTableUpdating(true)
        let currentPagination = pagination;
        if (paginationProps) {
            currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(currentPagination);
        let params = {
            ...pagination_params, is_active: true, pagination: true
        }
        if (subCategory !== 'all') {
            params['sub_category'] = subCategory
        }
        if (category !== 'all' && subCategory === 'all') {
            params['category'] = category
        }
        const url = GET_URL.stock.api
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                setPagination(currentPagination) 
                setItemList(response.data.data)
                setTableUpdating(false)
                if (response.data.data.length === 0) {
                    setBlankData('There is no staffs')
                    setItemList(null)
                }
            }
        })
    }

    const onChange = async (e) => {
        let { value, name } = e.target;
        if (value !== 0) {
            if (name === 'category') {
                setCategory(value)
                setSubCategory('all')
                setIsSubCategory(false)
                if (value !== "all") {
                    getSubCategoryList(value)
                }
            }
            else if (name === 'subCategory') {
                setSubCategory(value)
            }
        }
    }

    useEffect(() => {
        getStockList()
    }, [subCategory]);

    useEffect(() => {
        getStockList()
    }, [category]);

    const getSubCategoryList = (id) => {
        const g_url = GET_URL.subcategory.api
        const params = { is_active: 1, category: id }
        getRequest(g_url, params, props).then(response => {
            if (response && response.status === 200) {
                response.data.data.unshift({ id: 'all', name: "All" })
                setSubCategoryList(response.data.data)
                setIsSubCategory(response.data.data.length > 1 ? true : false)
            }
        })
    }


    const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
    };

    const handleCloseSnackBar = () => {
        setOpenSnackBar(false)
    }

    const columns = [
        {
            name: "category_name",
            label: <FormattedMessage {...messages.storeCategorySelectCategory} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "sub_category_name",
            label: <FormattedMessage {...messages.storeSubCategorySelectCategory} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "item_name",
            label: <FormattedMessage {...messages.storeItemName} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "item_code",
            label: <FormattedMessage {...messages.storeItemCode} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "property_values",
            label: <FormattedMessage {...messages.storePropertyValues} />,
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Tooltip title={value.map((data, index) => {
                            return (
                                <Box>
                                    {`${data.properties_name} - ${data.name}`}
                                </Box>
                            )
                        })} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Box className='stock-property-value'>
                                {value &&
                                    value.map((data, index) => {
                                        return (
                                            <Box>
                                                {(value.length < 3 || (value.length > 2 && index !== 1)) &&
                                                    `${data.properties_name} - ${data.name}`}
                                                {value.length > 2 && index === 1 &&
                                                    `${data.properties_name} - ${data.name} ....`
                                                }
                                            </Box>
                                        )
                                    })
                                }
                            </Box>
                        </Tooltip>
                    )
                }
            }
        },
        {
            name: "opening_stock",
            label: <FormattedMessage {...messages.storeOpeningStock} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "available_stock",
            label: <FormattedMessage {...messages.storeAvailableStock} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "current_selling_price",
            label: <FormattedMessage {...messages.storeCurrentSellingPrice} />,
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: 'id',
            label: 'Actions',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    const alreadySelected = selectedItems.some(item => item.id === value);

                    return (
                        <div>
                            {!alreadySelected ? (
                                <Button
                                    className='add-modify-button'
                                    onClick={e => setID(tableMeta.rowData)}
                                >
                                    Add Item
                                </Button>
                            ): (
                                <Button
                                    
                                >
                                    Selected
                                </Button>
                            )}
                        </div>
                    );
                }
            }
        },
        {
            name: 'category',
            label: '',
            options: {
                filter: false,
                sort: false,
                display: false
            }
        },
        {
            name: 'sub_category',
            label: '',
            options: {
                filter: false,
                sort: false,
                display: false
            }
        },
        {
            name: 'item',
            label: '',
            options: {
                filter: false,
                sort: false,
                display: false
            }
        },
        {
            name: 'property_value',
            label: '',
            options: {
                filter: false,
                sort: false,
                display: false
            }
        },


    ];

    return (
        <div>
            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Add Stock Item
                        </Typography>
                        {selectedItems.length > 0 && (
                            <Box textAlign="right">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => {
                                        props.selectedItem(selectedItems);
                                        setOpen(false);
                                    }}
                                >
                                    Add {selectedItems.length} Selected Item{selectedItems.length > 1 ? 's' : ''}
                                </Button>
                            </Box>
                        )}
                    </Toolbar>
                </AppBar>
                {pageLoading &&
                    <Box display='flex'>
                        <img src={loadingBar} className='loading' alt='loading' />
                    </Box>
                }
                {!pageLoading &&
                    <Box className='student-route-table-popup margin-top'>
                        <Grid container>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={categoryList}
                                    name='category'
                                    style='width-100'
                                    value={category}
                                    onChange={onChange}
                                    label={<FormattedMessage {...messages.storeCategorySelectCategory} />}
                                    error={fieldError.Category}
                                    hideSelect={true}
                                />
                            </Grid>
                            {isSubCategory &&
                                <Grid item md={3} xs={12} className='margin-top-20 padding-left-25'>
                                    <Dropdown
                                        data={subCategoryList}
                                        name='subCategory'
                                        style='width-100'
                                        value={subCategory}
                                        onChange={onChange}
                                        label={<FormattedMessage {...messages.storeSubCategorySelectCategory} />}
                                        error={fieldError.subCategory}
                                        hideSelect={true}
                                    />
                                </Grid>
                            }
                        </Grid>
                        {itemList !== null &&
                            <Grid container>
                                <Grid item md={12} xs={12}>
                                    <Box className='header-align'>
                                        {selectedItems.length > 0 && (
                                            <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
                                                {selectedItems.map((item) => (
                                                    <Tooltip title={item.item_name} key={item.id}>
                                                        <Chip
                                                            label={`${item.item_name}`}
                                                            onDelete={() => {
                                                                setSelectedItems(prev => prev.filter(i => i.id !== item.id));
                                                            }}
                                                            color="primary"
                                                            style={{marginBottom: '5px'}}
                                                        />
                                                    </Tooltip>
                                                ))}
                                            </Box>
                                        )}
                                        <AllMUIDataTable
                                            key={JSON.stringify(selectedItems.map(i => i.id))}  // key changes when selection changes
                                            data={itemList.data_list}
                                            columns={columns}
                                            options={options}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            onTableChange={getStockList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={itemList.count}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        }
                        {!pageLoading && itemList === null &&
                            <BlankPagewithIcon data={blankData} />
                        }
                    </Box>
                }
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnackBar}>
                    <Alert onClose={handleCloseSnackBar} severity="error">
                        {errorContent}
                    </Alert>
                </Snackbar>
            </Dialog>
        </div >
    );
});


export default AddStockItemStore
