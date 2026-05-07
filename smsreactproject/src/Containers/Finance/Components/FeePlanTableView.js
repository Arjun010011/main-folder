import React from 'react';
import {
    Box,
    Checkbox,
    Icon,
    Tooltip,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import { makeStyles } from '@material-ui/core/styles';
import { isUserHasPermission, numberWithCommas } from 'Includes/functions';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import CircularProgress from '@material-ui/core/CircularProgress';

const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) || {};
const is_fee_group_enabled = fee_config?.['is_fee_group_enabled'] == 1;

const useStyles = makeStyles((theme) => ({
    root: {
        marginBottom: theme.spacing(2),
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid #e8edf3',
    },
    header: {
        background: '#fff',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e8edf3',
    },
    standardName: {
        fontSize: '16px',
        fontWeight: 700,
        fontFamily: 'Roboto',
        color: '#3f4254',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    standardBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #4986FF 0%, #6ba3ff 100%)',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 700,
        flexShrink: 0,
    },
    actionBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    actionBtn: {
        cursor: 'pointer',
        color: '#a5a5a5',
        display: 'flex',
        alignItems: 'center',
        padding: '6px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: '#f4f7fa',
            color: '#4986FF',
        },
    },
    deleteBtn: {
        cursor: 'pointer',
        color: '#a5a5a5',
        display: 'flex',
        alignItems: 'center',
        padding: '6px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: '#fff0f0',
            color: '#ef5350',
        },
    },
    checkbox: {
        color: '#4986FF !important',
        padding: '4px',
    },
    approvedBadge: {
        background: '#e8f5e9',
        color: '#2e7d32',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        letterSpacing: '0.3px',
    },
    downloadBadge: {
        background: '#eef4ff',
        color: '#4986FF',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer',
        height: '24px',
        transition: 'all 0.2s ease',
        '&:hover': {
            background: '#e2ecff'
        }
    },
    tableContainer: {
        padding: '0',
    },
    tableHeader: {
        background: '#f7f9fe',
    },
    tableHeadCell: {
        color: '#b5b5c3 !important',
        fontWeight: '600 !important',
        fontSize: '12px !important',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom: '1px solid #ebedf3',
        padding: '10px 16px',
    },
    tableCell: {
        padding: '10px 16px',
        fontSize: '14px',
        borderBottom: '1px solid #f0f0f0',
        color: '#3f4254',
    },
    feeName: {
        fontWeight: 500,
        color: '#3f4254',
    },
    mandatory: {
        color: '#ef5350',
        marginLeft: '4px',
        fontWeight: 'bold',
        fontSize: '12px',
    },
    amount: {
        fontWeight: 600,
        color: '#3f4254',
        fontVariantNumeric: 'tabular-nums',
    },
    noFees: {
        padding: '30px 20px',
        textAlign: 'center',
        color: '#b5b5c3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 500,
        background: '#fafbfc',
        gap: '8px',
    },
    groupHeader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    groupName: {
        fontSize: '11px',
        color: '#b5b5c3',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    groupTotal: {
        fontSize: '14px',
        color: '#4986FF',
        fontWeight: 700,
    },
    totalRow: {
        '& td': {
            borderTop: '2px solid #ebedf3',
            fontWeight: '700 !important',
            fontSize: '14px',
            color: '#3f4254',
            background: '#f7f9fe',
        },
    },
    actionCell: {
        minWidth: '60px',
        textAlign: 'right',
    },
}));


const FeePlanTableView = ({
    feesTypeList,
    groupedFeeTypesByStandard,
    selectedStandardList,
    fullyApprovedFeeStdMap,
    onDeleteCard,
    onEditCard,
    onEditFeePlanFull,
    onCheckboxChange,
    onIncrementFee,
    onDownloadPdf,
    downloadingStandard,
}) => {
    const classes = useStyles();

    if (!feesTypeList || feesTypeList.length === 0) {
        return null;
    }

    return (
        <Box>
            {feesTypeList.map((standardFee, standardIndex) => {
                const groups = groupedFeeTypesByStandard[standardFee.id] || [];
                const isApproved = fullyApprovedFeeStdMap.includes(standardFee.id);

                const allFeeTypes = new Map();

                groups.forEach((group) => {
                    group.feeTypes.forEach((feeType) => {
                        const key = feeType.fee_type_name;
                        if (!allFeeTypes.has(key)) {
                            allFeeTypes.set(key, {
                                codename: feeType.codename,
                                is_mandatory: feeType.is_mandatory,
                                fee_type_name: feeType.fee_type_name,
                                amounts: {},
                            });
                        }
                        allFeeTypes.get(key).amounts[group.groupId] = {
                            amount: feeType.amount,
                            feeType: feeType,
                        };
                    });
                });

                const feeTypeRows = Array.from(allFeeTypes.values());

                // Calculate grand total for each group
                const groupTotals = {};
                groups.forEach((group) => {
                    groupTotals[group.groupId] = group.totalAmount || 0;
                });

                return (
                    <Paper key={`std-${standardIndex}`} className={classes.root} elevation={0}>
                        {/* Standard Header */}
                        <Box className={classes.header}>
                            <Box className={classes.standardName}>
                                <span className={classes.standardBadge}>{standardIndex + 1}</span>
                                {standardFee.name}
                            </Box>
                            <Box className={classes.actionBox}>
                                {onDownloadPdf && (
                                <Tooltip title="Download Fee Plan PDF" placement="top">
                                <Box
                                    className={classes.downloadBadge}
                                    onClick={() => {
                                        if (downloadingStandard !== standardFee.id) {
                                            onDownloadPdf(standardFee.id);
                                        }
                                    }}
                                >
                                    {downloadingStandard === standardFee.id ? (
                                        <CircularProgress size={14} style={{ marginRight: 4 }} />
                                    ) : (
                                        <CloudDownloadIcon style={{ fontSize: '14px' }} />
                                    )}

                                    {downloadingStandard === standardFee.id ? "Generating..." : "Download PDF"}
                                </Box>
                                </Tooltip>
                                )}
                                {isApproved ? (
                                    <>
                                        <span className={classes.approvedBadge}>
                                            <Icon className="fa fa-check-circle" style={{ fontSize: '14px' }} />
                                            Approved
                                        </span>
                                        {onIncrementFee && isUserHasPermission('assigned_fee_types', 'edit') && standardFee.fee_types.length > 0 && (
                                            <Tooltip title="Increment Fee" placement="top">
                                                <Box
                                                    className={classes.actionBtn}
                                                    onClick={() => onIncrementFee(standardFee)}
                                                >
                                                    <Icon className="fa fa-level-up" style={{ fontSize: '16px' }} />
                                                </Box>
                                            </Tooltip>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {standardFee.fee_types.length > 0 && isUserHasPermission('assigned_fee_types', 'delete') && (
                                            <Tooltip title="Delete all fee types" placement="top">
                                                <Box
                                                    className={classes.deleteBtn}
                                                    onClick={() => onDeleteCard(standardFee.id)}
                                                >
                                                    <Icon className="fa fa-trash" style={{ fontSize: '16px' }} />
                                                </Box>
                                            </Tooltip>
                                        )}
                                        {isUserHasPermission('assigned_fee_types', 'edit') &&
                                            is_fee_group_enabled &&
                                            standardFee.fee_types.length > 0 && (
                                                <Tooltip title="Edit fee types (drag and drop)" placement="top">
                                                    <Box
                                                        className={classes.actionBtn}
                                                        onClick={() => onEditCard(standardIndex)}
                                                    >
                                                        <EditIcon style={{ fontSize: '18px' }} />
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        {onEditFeePlanFull && isUserHasPermission(
                                            "assigned_fee_types",
                                            "edit"
                                        ) && !standardFee.is_approved && standardFee.fee_types.length > 0 &&
                                            <Tooltip title={'Edit fee plan'} enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <Box
                                                    className={classes.actionBtn}
                                                    onClick={() =>
                                                        onEditFeePlanFull(standardFee)
                                                    }
                                                >
                                                    <EditIcon style={{ fontSize: '18px' }} />
                                                </Box>
                                            </Tooltip>
                                        }
                                        <Tooltip title="Select for adding fee types" placement="top">
                                            <Checkbox
                                                className={classes.checkbox}
                                                checked={selectedStandardList.includes(standardFee.id)}
                                                onChange={() => onCheckboxChange(standardFee.id)}
                                            />
                                        </Tooltip>
                                    </>
                                )}
                            </Box>
                        </Box>

                        {/* Matrix Table */}
                        {standardFee.fee_types.length > 0 ? (
                            <TableContainer className={classes.tableContainer}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow className={classes.tableHeader}>
                                            <TableCell className={classes.tableHeadCell} style={{ width: '40%' }}>Fee Type</TableCell>
                                            {groups.map((group, idx) => (
                                                <TableCell key={idx} align="center" className={classes.tableHeadCell}>
                                                    <Box className={classes.groupHeader}>
                                                        <span className={classes.groupName}>{group.groupName}</span>
                                                    </Box>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {feeTypeRows.map((feeTypeData, rowIdx) => (
                                            <TableRow key={rowIdx} hover>
                                                <TableCell className={classes.tableCell}>
                                                    <span className={classes.feeName}>{feeTypeData.fee_type_name}</span>
                                                    {parseInt(feeTypeData.is_mandatory) === 1 && <span className={classes.mandatory}>*</span>}
                                                </TableCell>
                                                {groups.map((group, colIdx) => {
                                                    const cellData = feeTypeData.amounts[group.groupId];
                                                    return (
                                                        <TableCell
                                                            key={colIdx}
                                                            align="center"
                                                            className={classes.tableCell}
                                                        >
                                                            {cellData ? (
                                                                <Box display="flex" alignItems="center" justifyContent="center" position="relative">
                                                                    <span className={classes.amount}>{numberWithCommas(cellData.amount)}</span>
                                                                    {cellData.feeType.enabledActions && (
                                                                        <Box position="absolute" right={0} className={classes.actionCell}>
                                                                            {cellData.feeType.enabledActions}
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            ) : (
                                                                <span style={{ color: '#ddd' }}>—</span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                        {/* Total Row */}
                                        <TableRow className={classes.totalRow}>
                                            <TableCell className={classes.tableCell} style={{ fontWeight: 700 }}>
                                                Total
                                            </TableCell>
                                            {groups.map((group, idx) => (
                                                <TableCell key={idx} align="center" className={classes.tableCell}>
                                                    <span className={classes.amount} style={{ color: '#4986FF' }}>
                                                        {numberWithCommas(groupTotals[group.groupId] || 0)}
                                                    </span>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box className={classes.noFees}>
                                <Icon className="fa fa-info-circle" style={{ fontSize: '16px', color: '#b5b5c3' }} />
                                Fee(s) is not yet planned
                            </Box>
                        )}
                    </Paper>
                );
            })}
        </Box>
    );
};

export default FeePlanTableView;