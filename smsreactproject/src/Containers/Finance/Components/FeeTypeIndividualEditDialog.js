import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, FormControlLabel, Radio,
    RadioGroup, FormLabel, CircularProgress,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { makeStyles } from '@material-ui/core/styles';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import { getSettingValue, numberWithCommas } from 'Includes/functions';
import Swal from 'sweetalert2';
import { SUCCESS_MSG_PROPS } from 'Constants';

const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) || {};
const fee_plan_types = fee_config?.['fee_plan_types'] || '';
const feePlanTypesArr = fee_plan_types ? fee_plan_types.split(',').map(s => s.trim()) : [];

const useStyles = makeStyles((theme) => ({
    dialogPaper: {
        borderRadius: '16px',
        minWidth: '480px',
        maxWidth: '560px',
    },
    title: {
        fontSize: '18px',
        fontWeight: 700,
        color: '#3f4254',
        padding: '20px 24px 8px',
    },
    content: {
        padding: '8px 24px 20px',
    },
    feeTypeName: {
        fontSize: '15px',
        fontWeight: 600,
        color: '#4986FF',
        background: '#f0f5ff',
        padding: '10px 16px',
        borderRadius: '10px',
        marginBottom: '16px',
    },
    fieldGroup: {
        marginBottom: '14px',
    },
    fieldLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#b5b5c3',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '6px',
    },
    amountInput: {
        '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
        },
    },
    radioGroup: {
        flexDirection: 'row',
        gap: '16px',
    },
    actions: {
        padding: '12px 24px 20px',
        gap: '8px',
    },
    saveBtn: {
        background: 'linear-gradient(135deg, #4986FF, #6ba3ff)',
        color: '#fff',
        borderRadius: '10px',
        textTransform: 'capitalize',
        fontWeight: 600,
        padding: '8px 28px',
        '&:hover': {
            background: 'linear-gradient(135deg, #3a72e0, #5a92ef)',
        },
    },
    cancelBtn: {
        borderRadius: '10px',
        textTransform: 'capitalize',
        fontWeight: 600,
        padding: '8px 20px',
    },
}));

const FeeTypeIndividualEditDialog = ({ feeTypeData, onClose, onUpdate, props: parentProps }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [studentGroupList, setStudentGroupList] = useState([]);
    const [feeGroupList, setFeeGroupList] = useState([]);

    // Form values
    const [amount, setAmount] = useState(feeTypeData.amount || '');
    const [isMandatory, setIsMandatory] = useState(
        feeTypeData.is_mandatory != null ? String(feeTypeData.is_mandatory) : '1'
    );
    const [studentGroup, setStudentGroup] = useState(null);
    const [gender, setGender] = useState(null);
    const [isNewStudent, setIsNewStudent] = useState(null);

    const genderList = [
        { id: 'all', name: 'All' },
        { id: 'Boy', name: 'Boy' },
        { id: 'Girl', name: 'Girl' },
    ];

    const isNewStudentList = [
        { id: 'all', name: 'All' },
        { id: 1, name: 'Yes' },
        { id: 0, name: 'No' },
    ];

    const is_fee_group_enabled = fee_config?.['is_fee_group_enabled'] == 1;

    useEffect(() => {
        const fetchData = async () => {
            // Fetch student group list if fee_plan_types includes "1"
            if (feePlanTypesArr.includes('1')) {
                try {
                    const res = await getRequest(GET_URL.getstudentgroups.api, { is_active: true }, parentProps);
                    if (res && res.status === 200) {
                        const list = [{ id: 'all', name: 'All' }, ...res.data.data];
                        setStudentGroupList(list);
                        // Set initial student group value
                        if (feeTypeData.student_group) {
                            const found = list.find(sg => sg.id === feeTypeData.student_group);
                            setStudentGroup(found || { id: 'all', name: 'All' });
                        } else {
                            setStudentGroup({ id: 'all', name: 'All' });
                        }
                    }
                } catch (e) { /* ignore */ }
            }

            // Set initial gender value
            if (feePlanTypesArr.includes('2')) {
                if (feeTypeData.gender && feeTypeData.gender !== 'all') {
                    const found = genderList.find(g => g.id === feeTypeData.gender);
                    setGender(found || genderList[0]);
                } else {
                    setGender(genderList[0]);
                }
            }

            // Set initial is_new_student value
            if (feePlanTypesArr.includes('3')) {
                if (feeTypeData.is_new_student != null) {
                    const found = isNewStudentList.find(ns => ns.id === feeTypeData.is_new_student);
                    setIsNewStudent(found || isNewStudentList[0]);
                } else {
                    setIsNewStudent(isNewStudentList[0]);
                }
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const handleSave = () => {
        if (!amount || parseFloat(amount) <= 0) {
            Swal.fire({ icon: 'error', title: 'Amount is required', timer: 2000, showConfirmButton: false });
            return;
        }

        setSaving(true);
        const payload = {
            amount: parseFloat(amount),
            is_mandatory: parseInt(isMandatory),
        };

        if (feePlanTypesArr.includes('1')) {
            payload.student_group = studentGroup?.id === 'all' ? null : studentGroup?.id;
        }
        if (feePlanTypesArr.includes('2')) {
            payload.gender = gender?.id === 'all' ? null : gender?.id;
        }
        if (feePlanTypesArr.includes('3')) {
            payload.is_new_student = isNewStudent?.id === 'all' ? null : isNewStudent?.id;
        }

        const url = PUT_URL.feetypes.api + feeTypeData.id + '/';
        putRequest(url, payload, parentProps).then((response) => {
            setSaving(false);
            if (response && response.status === 200) {
                Swal.fire({
                    ...SUCCESS_MSG_PROPS,
                    title: 'Fee type updated successfully',
                });
                onUpdate();
                onClose();
            }
        }).catch(() => setSaving(false));
    };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            classes={{ paper: classes.dialogPaper }}
        >
            <DialogTitle className={classes.title} disableTypography>
                Edit Fee Type
            </DialogTitle>
            <DialogContent className={classes.content}>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Fee Type Name (read-only) */}
                        <Box className={classes.feeTypeName}>
                            {feeTypeData.fee_type_name}
                            {feeTypeData.stdName && (
                                <Box component="span" style={{ fontSize: '13px', color: '#8a8a8a', marginLeft: '8px' }}>
                                    — {feeTypeData.stdName}
                                </Box>
                            )}
                        </Box>

                        {/* Amount */}
                        <Box className={classes.fieldGroup}>
                            <Box className={classes.fieldLabel}>Amount</Box>
                            <TextField
                                fullWidth
                                variant="outlined"
                                size="small"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                type="number"
                                className={classes.amountInput}
                                placeholder="Enter amount"
                                autoFocus
                            />
                        </Box>

                        {/* Is Mandatory */}
                        <Box className={classes.fieldGroup}>
                            <Box className={classes.fieldLabel}>Is Mandatory</Box>
                            <RadioGroup
                                value={isMandatory}
                                onChange={(e) => setIsMandatory(e.target.value)}
                                className={classes.radioGroup}
                            >
                                <FormControlLabel value="1" control={<Radio color="primary" size="small" />} label="Yes" />
                                <FormControlLabel value="0" control={<Radio color="primary" size="small" />} label="No" />
                            </RadioGroup>
                        </Box>

                        {/* Student Group */}
                        {feePlanTypesArr.includes('1') && (
                            <Box className={classes.fieldGroup}>
                                <Box className={classes.fieldLabel}>Student Group</Box>
                                <Autocomplete
                                    size="small"
                                    options={studentGroupList}
                                    getOptionLabel={(opt) => opt.name || ''}
                                    value={studentGroup}
                                    onChange={(e, val) => setStudentGroup(val)}
                                    renderInput={(params) => (
                                        <TextField {...params} variant="outlined" placeholder="Select student group" />
                                    )}
                                    getOptionSelected={(opt, val) => opt.id === val?.id}
                                    disableClearable
                                />
                            </Box>
                        )}

                        {/* Gender */}
                        {feePlanTypesArr.includes('2') && (
                            <Box className={classes.fieldGroup}>
                                <Box className={classes.fieldLabel}>Gender</Box>
                                <Autocomplete
                                    size="small"
                                    options={genderList}
                                    getOptionLabel={(opt) => opt.name || ''}
                                    value={gender}
                                    onChange={(e, val) => setGender(val)}
                                    renderInput={(params) => (
                                        <TextField {...params} variant="outlined" placeholder="Select gender" />
                                    )}
                                    getOptionSelected={(opt, val) => opt.id === val?.id}
                                    disableClearable
                                />
                            </Box>
                        )}

                        {/* Is New Student */}
                        {feePlanTypesArr.includes('3') && (
                            <Box className={classes.fieldGroup}>
                                <Box className={classes.fieldLabel}>Is New Student</Box>
                                <Autocomplete
                                    size="small"
                                    options={isNewStudentList}
                                    getOptionLabel={(opt) => opt.name || ''}
                                    value={isNewStudent}
                                    onChange={(e, val) => setIsNewStudent(val)}
                                    renderInput={(params) => (
                                        <TextField {...params} variant="outlined" placeholder="Select" />
                                    )}
                                    getOptionSelected={(opt, val) => opt.id === val?.id}
                                    disableClearable
                                />
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions className={classes.actions}>
                <Button onClick={onClose} className={classes.cancelBtn}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    className={classes.saveBtn}
                    disabled={saving || loading}
                >
                    {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FeeTypeIndividualEditDialog;
