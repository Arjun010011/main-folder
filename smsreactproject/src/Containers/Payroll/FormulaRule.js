import React, { Component } from 'react'
import {
    Box, Grid, Button, TextField, MenuItem, Paper, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip, Chip, CircularProgress, Switch, Collapse,
    Tabs, Tab, Divider
} from '@material-ui/core'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline'
import SaveIcon from '@material-ui/icons/Save'
import DeleteOutlinedIcon from '@material-ui/icons/DeleteOutlined'
import CancelIcon from '@material-ui/icons/Cancel'
import EditOutlinedIcon from '@material-ui/icons/EditOutlined'
import DragHandleIcon from '@material-ui/icons/DragHandle'
import VisibilityIcon from '@material-ui/icons/Visibility'
import Swal from 'sweetalert2'
import LoadingGif from 'Components/LoadingGif'
import { getRequest, postRequest, putRequest, deleteRequest, patchRequest } from 'Includes/api/apicall'
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls'

const CALC_TYPES = [
    { value: 'FIXED', label: 'Fixed Amount', color: '#1976d2' },
    { value: 'PERCENT', label: 'Percentage', color: '#388e3c' },
    { value: 'REMAINING', label: 'Remaining', color: '#f57c00' },
    { value: 'EXPRESSION', label: 'Expression', color: '#7b1fa2' },
]

const EMPTY_ROW = {
    salary_component: '',
    calculation_type: 'FIXED',
    value: '',
    base_component: '',
    expression: '',
    sequence: 0,
    _isNew: true,
    _editing: true,
}

class FormulaRule extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            rules: [],
            formulas: [],
            components: [],
            selectedFormula: '',
            saving: {},          // { rowIndex: true } tracks saving state per row
            editingRows: {},     // { rowIndex: { ...editFields } } tracks inline editing
            bulkEditing: false,  // bulk-edit mode flag
            bulkSaving: false,   // saving-all indicator
            dragIdx: null,       // currently dragged row index
            dragOverIdx: null,   // row being dragged over
            // Preview panel state
            previewOpen: false,
            previewLoading: false,
            previewData: null,
            staffList: [],
            staffListLoaded: false,
            selectedStaff: '',
            activeTab: 0,    // 0 = Rules, 1 = Reference
        }
    }

    componentDidMount() {
        this.loadFormulas()
    }

    loadFormulas = () => {
        Promise.all([
            getRequest(GET_URL.salaryformula.api, {}, this.props),
            getRequest(GET_URL.salarycomponent.api, {}, this.props),
        ]).then(([fRes, cRes]) => {
            const formulas = fRes?.status === 200 ? (fRes.data.data || fRes.data) : []
            const components = cRes?.status === 200 ? (cRes.data.data || cRes.data) : []
            const formulaArr = Array.isArray(formulas) ? formulas : []
            const firstId = formulaArr.length > 0 ? formulaArr[0].id : ''
            this.setState({
                formulas: formulaArr,
                components: Array.isArray(components) ? components : [],
                selectedFormula: firstId,
                loading: false,
            }, () => {
                if (firstId) this.loadRules(firstId)
            })
        })
    }

    loadRules = (formulaId) => {
        if (!formulaId) { this.setState({ rules: [], editingRows: {}, bulkEditing: false }); return }
        getRequest(GET_URL.salaryformularule.api, { formula: formulaId }, this.props)
            .then(res => {
                const rules = res?.status === 200 ? (res.data.data || res.data) : []
                this.setState({ rules: Array.isArray(rules) ? rules : [], editingRows: {}, bulkEditing: false })
            })
    }

    handleFormulaChange = (e) => {
        const val = e.target.value
        this.setState({ selectedFormula: val, bulkEditing: false, editingRows: {} }, () => this.loadRules(val))
    }

    // ─── Add new empty row at bottom ───
    addRow = () => {
        const { rules, selectedFormula } = this.state
        const nextSeq = rules.length + 1
        const newRow = { ...EMPTY_ROW, sequence: nextSeq }
        const idx = rules.length
        this.setState(prev => ({
            rules: [...prev.rules, newRow],
            editingRows: {
                ...prev.editingRows,
                [idx]: {
                    salary_component: '',
                    calculation_type: 'FIXED',
                    value: '',
                    base_component: '',
                    expression: '',
                    sequence: nextSeq,
                    formula: selectedFormula,
                    _isNew: true,
                }
            }
        }))
    }

    // ─── Start editing existing row ───
    startEdit = (idx) => {
        const row = this.state.rules[idx]
        this.setState(prev => ({
            editingRows: {
                ...prev.editingRows,
                [idx]: {
                    salary_component: row.salary_component || '',
                    calculation_type: row.calculation_type || 'FIXED',
                    value: row.value || '',
                    base_component: row.base_component || '',
                    expression: row.expression || '',
                    sequence: row.sequence || 0,
                    formula: row.formula || this.state.selectedFormula,
                }
            }
        }))
    }

    // ─── Cancel edit ───
    cancelEdit = (idx) => {
        const row = this.state.rules[idx]
        if (row._isNew) {
            this.setState(prev => {
                const rules = [...prev.rules]
                rules.splice(idx, 1)
                const editingRows = { ...prev.editingRows }
                delete editingRows[idx]
                return { rules, editingRows }
            })
        } else {
            this.setState(prev => {
                const editingRows = { ...prev.editingRows }
                delete editingRows[idx]
                return { editingRows }
            })
        }
    }

    // ─── Handle field change in editing row ───
    handleFieldChange = (idx, field) => (e) => {
        const val = e.target.value
        this.setState(prev => ({
            editingRows: {
                ...prev.editingRows,
                [idx]: { ...prev.editingRows[idx], [field]: val }
            }
        }))
    }

    // ─── Build payload from edit data ───
    _buildPayload = (editData, idx) => {
        const baseComp = editData.base_component === 'GROSS' ? null : (editData.base_component || null)
        const payload = {
            formula: editData.formula || this.state.selectedFormula,
            salary_component: editData.salary_component,
            calculation_type: editData.calculation_type,
            sequence: editData.sequence || (idx + 1),
            value: editData.value || 0,
            base_component: baseComp,
            expression: editData.expression || '',
        }
        if (payload.calculation_type === 'FIXED') {
            payload.base_component = null; payload.expression = ''
        } else if (payload.calculation_type === 'PERCENT') {
            payload.expression = ''
        } else if (payload.calculation_type === 'REMAINING') {
            payload.base_component = null; payload.expression = ''; payload.value = 0
        } else if (payload.calculation_type === 'EXPRESSION') {
            payload.base_component = null; payload.value = 0
        }
        return payload
    }

    // ─── Save single row ───
    saveRow = (idx) => {
        const editData = this.state.editingRows[idx]
        const row = this.state.rules[idx]
        if (!editData) return

        if (!editData.salary_component || !editData.calculation_type) {
            Swal.fire({ icon: 'warning', text: 'Component and Calculation Type are required.' })
            return
        }

        const payload = this._buildPayload(editData, idx)
        this.setState(prev => ({ saving: { ...prev.saving, [idx]: true } }))

        const isNew = row._isNew
        const request = isNew
            ? postRequest(POST_URL.salaryformularule.api, payload, this.props)
            : putRequest(PUT_URL.salaryformularule.api + row.id + '/', payload, this.props)

        request.then(res => {
            this.setState(prev => {
                const saving = { ...prev.saving }
                delete saving[idx]
                return { saving }
            })
            if (res?.status === 200) {
                Swal.fire({ position: 'top-end', icon: 'success', title: isNew ? 'Rule added' : 'Rule updated', showConfirmButton: false, timer: 1200 })
                this.loadRules(this.state.selectedFormula)
            }
        })
    }

    // ─── Delete row ───
    handleDelete = (row, idx) => {
        if (row._isNew) {
            this.cancelEdit(idx)
            return
        }
        Swal.fire({
            title: 'Delete this rule?',
            text: `${this.getComponentName(row.salary_component)} will be removed.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Delete',
        }).then(result => {
            if (result.isConfirmed) {
                deleteRequest(DEL_URL.salaryformularule.api + row.id + '/')
                    .then(res => {
                        if (res?.status === 200) this.loadRules(this.state.selectedFormula)
                    })
            }
        })
    }

    // ═══════════════════════════════════════════
    //  BULK EDIT
    // ═══════════════════════════════════════════

    startBulkEdit = () => {
        const { rules, selectedFormula } = this.state
        const editingRows = {}
        rules.forEach((row, idx) => {
            if (!row._isNew) {
                editingRows[idx] = {
                    salary_component: row.salary_component || '',
                    calculation_type: row.calculation_type || 'FIXED',
                    value: row.value || '',
                    base_component: row.base_component || '',
                    expression: row.expression || '',
                    sequence: row.sequence || (idx + 1),
                    formula: row.formula || selectedFormula,
                }
            }
        })
        this.setState({ bulkEditing: true, editingRows })
    }

    cancelBulkEdit = () => {
        // Remove any new unsaved rows and exit bulk mode
        this.setState(prev => ({
            bulkEditing: false,
            editingRows: {},
            rules: prev.rules.filter(r => !r._isNew),
        }))
    }

    saveAllRows = () => {
        const { editingRows, rules, selectedFormula } = this.state

        // Validate all rows
        for (const idx of Object.keys(editingRows)) {
            const ed = editingRows[idx]
            if (!ed.salary_component || !ed.calculation_type) {
                Swal.fire({ icon: 'warning', text: `Row ${parseInt(idx) + 1}: Component and Type are required.` })
                return
            }
        }

        this.setState({ bulkSaving: true })

        const promises = Object.keys(editingRows).map(idx => {
            const i = parseInt(idx)
            const ed = editingRows[idx]
            const row = rules[i]
            const payload = this._buildPayload(ed, i)

            if (row._isNew) {
                return postRequest(POST_URL.salaryformularule.api, payload, this.props)
            } else {
                return putRequest(PUT_URL.salaryformularule.api + row.id + '/', payload, this.props)
            }
        })

        Promise.all(promises).then(results => {
            const allOk = results.every(r => r?.status === 200)
            this.setState({ bulkSaving: false })
            if (allOk) {
                Swal.fire({ position: 'top-end', icon: 'success', title: 'All rules saved', showConfirmButton: false, timer: 1200 })
            } else {
                Swal.fire({ icon: 'warning', text: 'Some rules may not have saved. Please review.' })
            }
            this.loadRules(selectedFormula)
        }).catch(() => {
            this.setState({ bulkSaving: false })
            Swal.fire({ icon: 'error', text: 'An error occurred while saving.' })
        })
    }

    // ═══════════════════════════════════════════
    //  TOGGLE OPTIONAL
    // ═══════════════════════════════════════════

    toggleOptional = (row) => {
        const newOptional = !row.is_optional
        const compName = row.salary_component_name || this.getComponentName(row.salary_component)

        // Send full row data to avoid null fields
        const putData = {
            formula: row.formula,
            salary_component: row.salary_component,
            sequence: row.sequence,
            calculation_type: row.calculation_type,
            value: row.value,
            base_component: row.base_component || null,
            expression: row.expression || '',
            is_active: row.is_active,
            is_optional: newOptional,
        }

        putRequest(PUT_URL.salaryformularule.api + row.id + '/', putData, this.props)
            .then(res => {
                if (res?.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: `${compName} ${newOptional ? 'marked as optional' : 'marked as required'}`,
                        showConfirmButton: false,
                        timer: 1200
                    })
                    this.loadRules(this.state.selectedFormula)
                }
            })
    }

    // ═══════════════════════════════════════════
    //  FORMULA PREVIEW
    // ═══════════════════════════════════════════

    togglePreview = () => {
        this.setState(prev => {
            const opening = !prev.previewOpen
            if (opening && !prev.staffListLoaded) {
                this.loadStaffList()
            }
            return { previewOpen: opening }
        })
    }

    loadStaffList = () => {
        getRequest(GET_URL.staff.api, { is_active: true }, this.props)
            .then(res => {
                const data = res?.status === 200 ? (res.data.data || res.data) : []
                const staffList = Array.isArray(data) ? data : []
                this.setState({ staffList, staffListLoaded: true })
            })
    }

    runPreview = () => {
        const { selectedFormula, selectedStaff } = this.state
        if (!selectedFormula || !selectedStaff) {
            Swal.fire({ icon: 'warning', text: 'Select a formula and staff member first.' })
            return
        }
        this.setState({ previewLoading: true, previewData: null })
        postRequest(POST_URL.formulapayrollgenerate.api, {
            action: 'formula_preview',
            formula: selectedFormula,
            staff: selectedStaff,
        }, this.props).then(res => {
            this.setState({ previewLoading: false })
            if (res?.status === 200) {
                this.setState({ previewData: res.data })
            } else {
                const msg = res?.data?.detail || res?.data?.non_field_errors?.[0] || 'Preview failed.'
                Swal.fire({ icon: 'error', text: msg })
            }
        }).catch(() => this.setState({ previewLoading: false }))
    }

    // ═══════════════════════════════════════════
    //  DRAG & DROP (HTML5)
    // ═══════════════════════════════════════════

    onDragStart = (idx) => (e) => {
        this.setState({ dragIdx: idx })
        e.dataTransfer.effectAllowed = 'move'
        // For Firefox
        e.dataTransfer.setData('text/plain', idx)
    }

    onDragOver = (idx) => (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (this.state.dragOverIdx !== idx) {
            this.setState({ dragOverIdx: idx })
        }
    }

    onDragLeave = () => {
        this.setState({ dragOverIdx: null })
    }

    onDrop = (targetIdx) => (e) => {
        e.preventDefault()
        const { dragIdx, rules, editingRows, bulkEditing, selectedFormula } = this.state
        if (dragIdx === null || dragIdx === targetIdx) {
            this.setState({ dragIdx: null, dragOverIdx: null })
            return
        }

        // Reorder rules array
        const newRules = [...rules]
        const [movedItem] = newRules.splice(dragIdx, 1)
        newRules.splice(targetIdx, 0, movedItem)

        // Reassign sequence numbers
        newRules.forEach((r, i) => { r.sequence = i + 1 })

        // Rebuild editingRows if in bulk-edit mode
        let newEditingRows = {}
        if (bulkEditing) {
            newRules.forEach((row, idx) => {
                if (!row._isNew) {
                    newEditingRows[idx] = {
                        salary_component: row.salary_component || '',
                        calculation_type: row.calculation_type || 'FIXED',
                        value: row.value || '',
                        base_component: row.base_component || '',
                        expression: row.expression || '',
                        sequence: idx + 1,
                        formula: row.formula || selectedFormula,
                    }
                }
            })
        }

        this.setState({
            rules: newRules,
            editingRows: bulkEditing ? newEditingRows : editingRows,
            dragIdx: null,
            dragOverIdx: null,
        }, () => {
            // If NOT in bulk edit, persist the new sequence immediately
            if (!bulkEditing) {
                this._persistSequences(newRules)
            }
        })
    }

    onDragEnd = () => {
        this.setState({ dragIdx: null, dragOverIdx: null })
    }

    _persistSequences = (rules) => {
        // Fire PUT for each rule to update sequence
        const promises = rules
            .filter(r => !r._isNew && r.id)
            .map(r => putRequest(
                PUT_URL.salaryformularule.api + r.id + '/',
                { ...this._getMinimalPayload(r), sequence: r.sequence },
                this.props
            ))

        Promise.all(promises).then(results => {
            const allOk = results.every(r => r?.status === 200)
            if (allOk) {
                Swal.fire({ position: 'top-end', icon: 'success', title: 'Order updated', showConfirmButton: false, timer: 800 })
            }
            this.loadRules(this.state.selectedFormula)
        })
    }

    _getMinimalPayload = (row) => ({
        formula: row.formula || this.state.selectedFormula,
        salary_component: row.salary_component,
        calculation_type: row.calculation_type,
        sequence: row.sequence,
        value: row.value || 0,
        base_component: row.base_component || null,
        expression: row.expression || '',
    })

    // ─── Helpers ───
    getComponentName = (id) => {
        const c = this.state.components.find(c => c.id === id || c.id === Number(id))
        return c ? c.name : ''
    }

    getComponentCodename = (id) => {
        const c = this.state.components.find(c => c.id === id || c.id === Number(id))
        return c ? c.codename : ''
    }

    renderTypeChip = (type) => {
        const ct = CALC_TYPES.find(t => t.value === type)
        if (!ct) return type
        return (
            <Chip label={ct.label} size="small"
                style={{ backgroundColor: ct.color, color: '#fff', fontWeight: 500, fontSize: 11 }} />
        )
    }

    renderDetailsCell = (row) => {
        if (row.calculation_type === 'FIXED') return `₹${row.value}`
        if (row.calculation_type === 'PERCENT') {
            const baseName = row.base_component_name || this.getComponentName(row.base_component) || 'Gross'
            return `${row.value}% of ${baseName}`
        }
        if (row.calculation_type === 'EXPRESSION') {
            return (
                <code style={{
                    fontSize: 12, backgroundColor: '#f5f5f5',
                    padding: '2px 6px', borderRadius: 4
                }}>
                    {row.expression}
                </code>
            )
        }
        return <span style={{ fontStyle: 'italic', color: '#888' }}>Auto balance</span>
    }

    // ─── Row renderers ───

    renderEditableRow = (idx) => {
        const ed = this.state.editingRows[idx]
        const { components, saving, bulkEditing } = this.state
        const isSaving = saving[idx]

        return (
            <TableRow key={`edit-${idx}`} style={{ backgroundColor: '#fffde7' }}>
                {/* Drag handle */}
                <TableCell align="center" style={{ width: 40, cursor: 'grab', padding: '4px 0' }}>
                    <DragHandleIcon style={{ color: '#bbb', fontSize: 20 }} />
                </TableCell>
                {/* Sequence */}
                <TableCell align="center" style={{ width: 50 }}>
                    <TextField size="small" variant="outlined" type="number"
                        value={ed.sequence} onChange={this.handleFieldChange(idx, 'sequence')}
                        inputProps={{ style: { textAlign: 'center', padding: '6px 4px', width: 36 } }} />
                </TableCell>
                {/* Component */}
                <TableCell>
                    <TextField select size="small" variant="outlined" fullWidth
                        value={ed.salary_component} onChange={this.handleFieldChange(idx, 'salary_component')}>
                        {components.map(c => (
                            <MenuItem key={c.id} value={c.id}>
                                {c.name} {c.codename ? <span style={{ color: '#888' }}>({c.codename})</span> : ''}
                            </MenuItem>
                        ))}
                    </TextField>
                </TableCell>
                {/* Calc Type */}
                <TableCell>
                    <TextField select size="small" variant="outlined" fullWidth
                        value={ed.calculation_type} onChange={this.handleFieldChange(idx, 'calculation_type')}>
                        {CALC_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </TextField>
                </TableCell>
                {/* Value / Expression / Base */}
                <TableCell colSpan={1}>
                    {ed.calculation_type === 'FIXED' && (
                        <TextField size="small" variant="outlined" type="number" placeholder="Amount"
                            value={ed.value} onChange={this.handleFieldChange(idx, 'value')}
                            inputProps={{ style: { padding: '6px 8px' } }} style={{ width: 100 }} />
                    )}
                    {ed.calculation_type === 'PERCENT' && (
                        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                            <TextField size="small" variant="outlined" type="number" placeholder="%"
                                value={ed.value} onChange={this.handleFieldChange(idx, 'value')}
                                inputProps={{ style: { padding: '6px 8px' } }} style={{ width: 70 }} />
                            <Typography variant="body2" style={{ whiteSpace: 'nowrap' }}>% of</Typography>
                            <TextField select size="small" variant="outlined"
                                value={ed.base_component || 'GROSS'} onChange={this.handleFieldChange(idx, 'base_component')}
                                style={{ minWidth: 130 }}>
                                <MenuItem value="GROSS">Gross Salary</MenuItem>
                                {components.filter(c => !c.is_deduction).map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    )}
                    {ed.calculation_type === 'EXPRESSION' && (
                        <TextField size="small" variant="outlined" fullWidth placeholder="e.g. round(BASIC * 0.12)"
                            value={ed.expression} onChange={this.handleFieldChange(idx, 'expression')}
                            inputProps={{ style: { padding: '6px 8px', fontFamily: 'monospace', fontSize: 13 } }} />
                    )}
                    {ed.calculation_type === 'REMAINING' && (
                        <Typography variant="body2" style={{ fontStyle: 'italic', color: '#888' }}>
                            Auto-calculated balance
                        </Typography>
                    )}
                </TableCell>
                {/* Actions — per-row save only when NOT in bulk mode */}
                <TableCell align="center">
                    {!bulkEditing && (
                        <Box display="flex" style={{ gap: 4 }}>
                            <Tooltip title="Save">
                                <IconButton size="small" onClick={() => this.saveRow(idx)}
                                    disabled={isSaving}
                                    style={{ color: '#2e7d32' }}>
                                    {isSaving ? <CircularProgress size={18} /> : <SaveIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                                <IconButton size="small" onClick={() => this.cancelEdit(idx)}>
                                    <CancelIcon fontSize="small" style={{ color: '#757575' }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                    {bulkEditing && (
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => this.handleDelete(this.state.rules[idx], idx)}>
                                <DeleteOutlinedIcon fontSize="small" style={{ color: '#f44336' }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </TableCell>
            </TableRow>
        )
    }

    renderReadOnlyRow = (row, idx) => {
        const { dragOverIdx } = this.state
        const isDragOver = dragOverIdx === idx
        const isOptional = row.is_optional === true

        return (
            <TableRow key={row.id || idx} hover
                draggable
                onDragStart={this.onDragStart(idx)}
                onDragOver={this.onDragOver(idx)}
                onDragLeave={this.onDragLeave}
                onDrop={this.onDrop(idx)}
                onDragEnd={this.onDragEnd}
                style={{
                    borderTop: isDragOver ? '2px solid #1976d2' : undefined,
                    opacity: this.state.dragIdx === idx ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                }}
            >
                {/* Drag handle */}
                <TableCell align="center" style={{ width: 40, cursor: 'grab', padding: '4px 0' }}>
                    <DragHandleIcon style={{ color: '#bbb', fontSize: 20 }} />
                </TableCell>
                <TableCell align="center" style={{ fontWeight: 600, color: '#555' }}>
                    {idx + 1}
                </TableCell>
                <TableCell>
                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                        <Box>
                            <Typography variant="body2" style={{ fontWeight: 500 }}>
                                {row.salary_component_name || this.getComponentName(row.salary_component)}
                            </Typography>
                            {(row.salary_component_codename || this.getComponentCodename(row.salary_component)) && (
                                <Typography variant="caption" style={{
                                    fontFamily: 'monospace', color: '#888', fontSize: 11,
                                    backgroundColor: '#f5f5f5', padding: '1px 5px', borderRadius: 3
                                }}>
                                    {row.salary_component_codename || this.getComponentCodename(row.salary_component)}
                                </Typography>
                            )}
                        </Box>
                        {isOptional && (
                            <Chip label="Optional" size="small" style={{
                                backgroundColor: '#e8f5e9', color: '#2e7d32',
                                fontWeight: 500, fontSize: 10, height: 20,
                            }} />
                        )}
                    </Box>
                </TableCell>
                <TableCell>{this.renderTypeChip(row.calculation_type)}</TableCell>
                <TableCell>{this.renderDetailsCell(row)}</TableCell>
                {/* Optional Toggle */}
                <TableCell align="center" style={{ width: 70 }}>
                    <Tooltip title={isOptional ? 'Staff can opt in/out — click to make required' : 'Required — click to make optional (staff can opt in/out)'}>
                        <Switch
                            size="small"
                            checked={isOptional}
                            onChange={() => this.toggleOptional(row)}
                            color="primary"
                        />
                    </Tooltip>
                </TableCell>
                <TableCell align="center">
                    <Box display="flex" style={{ gap: 4 }}>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => this.startEdit(idx)}>
                                <EditOutlinedIcon fontSize="small" style={{ color: '#1976d2' }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => this.handleDelete(row, idx)}>
                                <DeleteOutlinedIcon fontSize="small" style={{ color: '#f44336' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </TableCell>
            </TableRow>
        )
    }

    // ─── Drag-enabled editable row (bulk mode) ───
    renderDraggableEditRow = (idx) => {
        const { dragOverIdx } = this.state

        return (
            <TableRow key={`drag-edit-${idx}`}
                draggable
                onDragStart={this.onDragStart(idx)}
                onDragOver={this.onDragOver(idx)}
                onDragLeave={this.onDragLeave}
                onDrop={this.onDrop(idx)}
                onDragEnd={this.onDragEnd}
                style={{
                    backgroundColor: '#fffde7',
                    borderTop: dragOverIdx === idx ? '2px solid #1976d2' : undefined,
                    opacity: this.state.dragIdx === idx ? 0.4 : 1,
                }}
            >
                {this.renderEditableRow(idx).props.children}
            </TableRow>
        )
    }

    // ═══════════════════════════════════════════
    //  REFERENCE TAB
    // ═══════════════════════════════════════════

    renderReferenceTab = () => {
        const sectionStyle = { marginBottom: 24 }
        const tableHeaderStyle = { fontWeight: 700, backgroundColor: '#f5f5f5', fontSize: 13 }
        const codeStyle = { fontFamily: 'monospace', fontSize: 13, backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }
        const headingStyle = { fontWeight: 600, marginBottom: 8, color: '#1565c0' }
        const subHeadingStyle = { fontWeight: 600, marginBottom: 6, marginTop: 16, color: '#333' }

        return (
            <Box p={3}>
                {/* ─── Calculation Types ─── */}
                <Box style={sectionStyle}>
                    <Typography variant="h6" style={headingStyle}>Calculation Types</Typography>
                    <Typography variant="body2" style={{ marginBottom: 12, color: '#555' }}>
                        Each rule uses one of four calculation types. The type determines how the component value is computed.
                    </Typography>
                    <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell style={tableHeaderStyle}>Type</TableCell>
                                    <TableCell style={tableHeaderStyle}>How it works</TableCell>
                                    <TableCell style={tableHeaderStyle}>Example</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Chip label="Fixed Amount" size="small" style={{ backgroundColor: '#1976d2', color: '#fff', fontWeight: 500 }} /></TableCell>
                                    <TableCell>A flat currency amount. Prorated by attendance automatically.</TableCell>
                                    <TableCell><code style={codeStyle}>₹15,000</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Percentage" size="small" style={{ backgroundColor: '#388e3c', color: '#fff', fontWeight: 500 }} /></TableCell>
                                    <TableCell>A percentage of a base component (or Gross Salary). Prorated by attendance.</TableCell>
                                    <TableCell><code style={codeStyle}>30% of Gross Salary</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Remaining" size="small" style={{ backgroundColor: '#f57c00', color: '#fff', fontWeight: 500 }} /></TableCell>
                                    <TableCell>Auto-calculated as the difference between the base (Gross or another component) and all previously computed non-deduction earnings. Prorated.</TableCell>
                                    <TableCell><code style={codeStyle}>Gross − (BASIC + HRA + ...)</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Chip label="Expression" size="small" style={{ backgroundColor: '#7b1fa2', color: '#fff', fontWeight: 500 }} /></TableCell>
                                    <TableCell>A custom formula using variables, operators, functions, and conditionals. Most flexible type.</TableCell>
                                    <TableCell><code style={codeStyle}>200 if GS &gt; 25000 else 0</code></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Divider />

                {/* ─── Context Variables ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>Context Variables</Typography>
                    <Typography variant="body2" style={{ marginBottom: 12, color: '#555' }}>
                        These variables are automatically available inside <strong>Expression</strong> type rules.
                        Variable names are case-insensitive.
                    </Typography>
                    <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell style={tableHeaderStyle}>Variable</TableCell>
                                    <TableCell style={tableHeaderStyle}>Type</TableCell>
                                    <TableCell style={tableHeaderStyle}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><code style={codeStyle}>GROSS</code> or <code style={codeStyle}>GS</code></TableCell><TableCell>Number</TableCell><TableCell>Staff's monthly gross salary (annual salary ÷ 12)</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>WORKING</code></TableCell><TableCell>Number</TableCell><TableCell>Total working days in the month</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>PRESENT</code></TableCell><TableCell>Number</TableCell><TableCell>Staff's present days (fractional for half-days)</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>ESIC_OPTED</code></TableCell><TableCell>Boolean</TableCell><TableCell>True if staff has an ESI number on file</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>PF_OPTED</code></TableCell><TableCell>Boolean</TableCell><TableCell>True if staff has a PF number on file</TableCell></TableRow>
                                <TableRow style={{ backgroundColor: '#e8f5e9' }}>
                                    <TableCell><code style={codeStyle}>BASIC</code>, <code style={codeStyle}>HRA</code>, etc.</TableCell><TableCell>Number</TableCell>
                                    <TableCell>Any previously computed component's codename (processed in sequence order). You can reference any component that has a lower sequence number.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Divider />

                {/* ─── Built-in Functions ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>Built-in Functions</Typography>
                    <Typography variant="body2" style={{ marginBottom: 12, color: '#555' }}>
                        Only these whitelisted functions can be used in expressions. All other function calls are blocked for security.
                    </Typography>
                    <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell style={tableHeaderStyle}>Function</TableCell>
                                    <TableCell style={tableHeaderStyle}>Description</TableCell>
                                    <TableCell style={tableHeaderStyle}>Example</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><code style={codeStyle}>min(a, b)</code></TableCell><TableCell>Returns the smaller of two values</TableCell><TableCell><code style={codeStyle}>min(BASIC * 0.5, 15000)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>max(a, b)</code></TableCell><TableCell>Returns the larger of two values</TableCell><TableCell><code style={codeStyle}>max(GS - HRA, 0)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>round(x)</code></TableCell><TableCell>Rounds to nearest integer</TableCell><TableCell><code style={codeStyle}>round(BASIC * 0.12)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>abs(x)</code></TableCell><TableCell>Absolute value</TableCell><TableCell><code style={codeStyle}>abs(GS - 25000)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>ceil(x)</code></TableCell><TableCell>Rounds up to next integer</TableCell><TableCell><code style={codeStyle}>ceil(GS * 0.0075)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>floor(x)</code></TableCell><TableCell>Rounds down to integer</TableCell><TableCell><code style={codeStyle}>floor(BASIC / 12)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>int(x)</code></TableCell><TableCell>Truncates to integer (drops decimals)</TableCell><TableCell><code style={codeStyle}>int(GS / 26)</code></TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>float(x)</code></TableCell><TableCell>Converts to floating-point number</TableCell><TableCell><code style={codeStyle}>float(WORKING)</code></TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Divider />

                {/* ─── Operators ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>Operators</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" style={subHeadingStyle}>Arithmetic</Typography>
                            <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow><TableCell><code style={codeStyle}>+</code></TableCell><TableCell>Addition</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>-</code></TableCell><TableCell>Subtraction</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>*</code></TableCell><TableCell>Multiplication</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>/</code></TableCell><TableCell>Division</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>//</code></TableCell><TableCell>Floor division</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>%</code></TableCell><TableCell>Modulo (remainder)</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>**</code></TableCell><TableCell>Power</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" style={subHeadingStyle}>Comparison &amp; Logic</Typography>
                            <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow><TableCell><code style={codeStyle}>==</code></TableCell><TableCell>Equal to</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>!=</code></TableCell><TableCell>Not equal</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>&gt;</code> <code style={codeStyle}>&gt;=</code></TableCell><TableCell>Greater than / or equal</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>&lt;</code> <code style={codeStyle}>&lt;=</code></TableCell><TableCell>Less than / or equal</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>and</code></TableCell><TableCell>Logical AND</TableCell></TableRow>
                                        <TableRow><TableCell><code style={codeStyle}>or</code></TableCell><TableCell>Logical OR</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                {/* ─── Conditional Expressions ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>Conditional Expressions (if / else)</Typography>
                    <Typography variant="body2" style={{ marginBottom: 12, color: '#555' }}>
                        You can use Python-style ternary expressions to apply conditions. The format is:
                    </Typography>
                    <Box style={{ backgroundColor: '#263238', color: '#e0e0e0', padding: '12px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 14, marginBottom: 12 }}>
                        <span style={{ color: '#80cbc4' }}>value_if_true</span>{' '}
                        <span style={{ color: '#ffcc80' }}>if</span>{' '}
                        <span style={{ color: '#ef9a9a' }}>condition</span>{' '}
                        <span style={{ color: '#ffcc80' }}>else</span>{' '}
                        <span style={{ color: '#80cbc4' }}>value_if_false</span>
                    </Box>
                    <Typography variant="subtitle2" style={subHeadingStyle}>Examples</Typography>
                    <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell style={tableHeaderStyle}>Expression</TableCell>
                                    <TableCell style={tableHeaderStyle}>Meaning</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><code style={codeStyle}>200 if GS &gt; 25000 else 0</code></TableCell><TableCell>₹200 Professional Tax if gross &gt; ₹25,000, else ₹0</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>round(GS * 0.0075) if GS &gt; 21000 else 0</code></TableCell><TableCell>ESIC at 0.75% only if gross exceeds ₹21,000</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>round(BASIC * 0.12) if PF_OPTED else 0</code></TableCell><TableCell>PF at 12% of Basic only if staff has opted for PF</TableCell></TableRow>
                                <TableRow><TableCell><code style={codeStyle}>min(BASIC * 0.5, 15000)</code></TableCell><TableCell>50% of Basic or ₹15,000, whichever is lower</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Divider />

                {/* ─── Proration ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>Proration (Loss of Pay)</Typography>
                    <Box style={{ backgroundColor: '#fff3e0', padding: '12px 16px', borderRadius: 8, border: '1px solid #ffe0b2', marginBottom: 12 }}>
                        <Typography variant="body2" style={{ color: '#e65100' }}>
                            <strong>Automatic:</strong> For Fixed, Percentage, and Remaining types, values are automatically prorated by <code style={codeStyle}>PRESENT / WORKING</code> days.
                        </Typography>
                    </Box>
                    <Box style={{ backgroundColor: '#e8f5e9', padding: '12px 16px', borderRadius: 8, border: '1px solid #c8e6c9' }}>
                        <Typography variant="body2" style={{ color: '#2e7d32' }}>
                            <strong>Expressions:</strong> If your expression uses <code style={codeStyle}>WORKING</code> or <code style={codeStyle}>PRESENT</code>, the engine assumes you're handling proration yourself and will <strong>not</strong> auto-prorate.
                            Otherwise, expression results are also prorated.
                        </Typography>
                    </Box>
                </Box>

                <Divider />

                {/* ─── Worked Example ─── */}
                <Box style={{ ...sectionStyle, marginTop: 24 }}>
                    <Typography variant="h6" style={headingStyle}>📋 Worked Example — Complete Formula Setup</Typography>
                    <Typography variant="body2" style={{ marginBottom: 12, color: '#555' }}>
                        Suppose Staff has <strong>Gross Salary = ₹50,000</strong>. Here's how to set up the formula rules:
                    </Typography>
                    <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                    <TableCell style={{ fontWeight: 700 }}>#</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Component</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Codename</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Type</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Configuration</TableCell>
                                    <TableCell style={{ fontWeight: 700 }}>Result (₹50,000 GS)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>1</TableCell>
                                    <TableCell><strong>HRA</strong></TableCell>
                                    <TableCell><code style={codeStyle}>HRA</code></TableCell>
                                    <TableCell><Chip label="Percentage" size="small" style={{ backgroundColor: '#388e3c', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell>30% of <strong>Gross Salary</strong></TableCell>
                                    <TableCell><code style={codeStyle}>₹15,000</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>2</TableCell>
                                    <TableCell><strong>BA + DA</strong></TableCell>
                                    <TableCell><code style={codeStyle}>BADA</code></TableCell>
                                    <TableCell><Chip label="Expression" size="small" style={{ backgroundColor: '#7b1fa2', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>min(GS - HRA, 15000)</code></TableCell>
                                    <TableCell><code style={codeStyle}>₹15,000</code> <span style={{ color: '#888', fontSize: 11 }}>(min of 35000, 15000)</span></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>3</TableCell>
                                    <TableCell><strong>Other Allowance</strong></TableCell>
                                    <TableCell><code style={codeStyle}>OA</code></TableCell>
                                    <TableCell><Chip label="Remaining" size="small" style={{ backgroundColor: '#f57c00', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell>Auto: Gross − (HRA + BADA)</TableCell>
                                    <TableCell><code style={codeStyle}>₹20,000</code></TableCell>
                                </TableRow>
                                <TableRow style={{ backgroundColor: '#fff3e0' }}>
                                    <TableCell>4</TableCell>
                                    <TableCell><strong>PF</strong> <Chip label="Ded" size="small" style={{ backgroundColor: '#ffecb3', color: '#e65100', fontSize: 9, height: 18, marginLeft: 4 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>PF</code></TableCell>
                                    <TableCell><Chip label="Expression" size="small" style={{ backgroundColor: '#7b1fa2', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>round(BADA * 0.12)</code></TableCell>
                                    <TableCell><code style={codeStyle}>₹1,800</code></TableCell>
                                </TableRow>
                                <TableRow style={{ backgroundColor: '#fff3e0' }}>
                                    <TableCell>5</TableCell>
                                    <TableCell><strong>ESIC</strong> <Chip label="Ded" size="small" style={{ backgroundColor: '#ffecb3', color: '#e65100', fontSize: 9, height: 18, marginLeft: 4 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>ESIC</code></TableCell>
                                    <TableCell><Chip label="Expression" size="small" style={{ backgroundColor: '#7b1fa2', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>round(GS * 0.0075) if GS &gt; 21000 else 0</code></TableCell>
                                    <TableCell><code style={codeStyle}>₹375</code></TableCell>
                                </TableRow>
                                <TableRow style={{ backgroundColor: '#fff3e0' }}>
                                    <TableCell>6</TableCell>
                                    <TableCell><strong>Professional Tax</strong> <Chip label="Ded" size="small" style={{ backgroundColor: '#ffecb3', color: '#e65100', fontSize: 9, height: 18, marginLeft: 4 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>PT</code></TableCell>
                                    <TableCell><Chip label="Expression" size="small" style={{ backgroundColor: '#7b1fa2', color: '#fff', fontSize: 11 }} /></TableCell>
                                    <TableCell><code style={codeStyle}>200 if GS &gt; 25000 else 0</code></TableCell>
                                    <TableCell><code style={codeStyle}>₹200</code></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Summary */}
                    <Box mt={2} display="flex" flexWrap="wrap" style={{
                        gap: 24, padding: '12px 16px',
                        borderRadius: 6, border: '1px solid #c8e6c9',
                        backgroundColor: '#f1f8e9',
                    }}>
                        <Typography variant="body2"><strong>Gross Earnings:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2e7d32' }}>₹50,000</span> (HRA + BADA + OA)</Typography>
                        <Typography variant="body2"><strong>Total Deductions:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e65100' }}>₹2,375</span> (PF + ESIC + PT)</Typography>
                        <Typography variant="body2"><strong>Net Pay:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b5e20', fontSize: 15 }}>₹47,625</span></Typography>
                    </Box>

                    {/* Important notes */}
                    <Box mt={2} style={{ backgroundColor: '#e3f2fd', padding: '12px 16px', borderRadius: 8, border: '1px solid #bbdefb' }}>
                        <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 4 }}>💡 Key Points</Typography>
                        <Typography variant="body2" component="div">
                            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                                <li><strong>Sequence matters</strong> — rules are evaluated top-to-bottom. A rule can only reference components from earlier sequences.</li>
                                <li><strong>Codenames are IDs</strong> — use the component's codename (uppercase) in expressions, e.g. <code style={codeStyle}>BADA</code>, not "BA + DA".</li>
                                <li><strong>Deductions</strong> — mark components as deductions in the Salary Components page. They'll be subtracted from gross earnings.</li>
                                <li><strong>Remaining type</strong> — perfect for "catch-all" components like Other Allowance. It auto-calculates the balance.</li>
                                <li><strong>Test with Preview</strong> — use the Live Preview panel (Rules tab) to verify calculations against real staff data before generating payroll.</li>
                            </ul>
                        </Typography>
                    </Box>
                </Box>
            </Box>
        )
    }

    render() {
        const { loading, rules, formulas, selectedFormula, editingRows, bulkEditing, bulkSaving, activeTab } = this.state

        if (loading) return <LoadingGif />

        const existingRuleCount = rules.filter(r => !r._isNew).length
        const hasAnyEdits = Object.keys(editingRows).length > 0

        return (
            <Box p={2}>
                <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 16 }}>
                    Formula Rules
                </Typography>

                {/* ─── Tab Navigation ─── */}
                <Paper style={{ marginBottom: 0 }}>
                    <Tabs value={activeTab} onChange={(e, v) => this.setState({ activeTab: v })}
                        indicatorColor="primary" textColor="primary"
                        style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <Tab label="Rules" />
                        <Tab label="Reference & Examples" />
                    </Tabs>
                </Paper>

                {/* ─── Tab: Reference ─── */}
                {activeTab === 1 && (
                    <Paper style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        {this.renderReferenceTab()}
                    </Paper>
                )}

                {/* ─── Tab: Rules ─── */}
                {activeTab === 0 && (<>
                    <Paper style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        <Box p={3}>
                            {/* Formula selector + action buttons */}
                            <Grid container spacing={2} alignItems="center" style={{ marginBottom: 20 }}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField select fullWidth label="Select Formula" variant="outlined" size="small"
                                        value={selectedFormula} onChange={this.handleFormulaChange}
                                        disabled={bulkEditing}>
                                        {formulas.map(f => (
                                            <MenuItem key={f.id} value={f.id}>
                                                {f.name} {f.financial_year_name ? `(${f.financial_year_name})` : ''}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6} md={8} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                                    <Chip label={`${existingRuleCount} rules`}
                                        style={{ backgroundColor: '#e3f2fd', fontWeight: 500 }} />

                                    {/* Bulk Edit / Save All / Cancel All */}
                                    {!bulkEditing ? (
                                        <>
                                            <Button variant="outlined" color="primary"
                                                startIcon={<EditOutlinedIcon />}
                                                onClick={this.startBulkEdit}
                                                disabled={!selectedFormula || existingRuleCount === 0}>
                                                Bulk Edit
                                            </Button>
                                            <Button variant="contained" color="primary"
                                                startIcon={<AddCircleOutlineIcon />}
                                                onClick={this.addRow} disabled={!selectedFormula}>
                                                Add Rule
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button variant="outlined"
                                                startIcon={<CancelIcon />}
                                                onClick={this.cancelBulkEdit}
                                                disabled={bulkSaving}>
                                                Cancel
                                            </Button>
                                            <Button variant="contained" color="primary"
                                                startIcon={bulkSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                                onClick={this.saveAllRows}
                                                disabled={bulkSaving}>
                                                {bulkSaving ? 'Saving...' : 'Save All'}
                                            </Button>
                                            <Button variant="contained" color="primary"
                                                startIcon={<AddCircleOutlineIcon />}
                                                onClick={this.addRow} disabled={!selectedFormula}>
                                                Add Rule
                                            </Button>
                                        </>
                                    )}
                                </Grid>
                            </Grid>

                            {/* Bulk edit hint */}
                            {bulkEditing && (
                                <Box mb={2} p={1} style={{
                                    backgroundColor: '#fff3e0', borderRadius: 6,
                                    border: '1px solid #ffe0b2',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <DragHandleIcon style={{ color: '#f57c00' }} />
                                    <Typography variant="body2" style={{ color: '#e65100' }}>
                                        <strong>Bulk Edit Mode</strong> — Drag rows to reorder • Edit any field inline • Click <strong>Save All</strong> when done
                                    </Typography>
                                </Box>
                            )}

                            {/* Table */}
                            <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8, overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#fafafa' }}>
                                            <TableCell align="center" style={{ fontWeight: 700, width: 40 }}></TableCell>
                                            <TableCell align="center" style={{ fontWeight: 700, width: 50 }}>#</TableCell>
                                            <TableCell style={{ fontWeight: 700, minWidth: 160 }}>Component</TableCell>
                                            <TableCell style={{ fontWeight: 700, minWidth: 120 }}>Type</TableCell>
                                            <TableCell style={{ fontWeight: 700, minWidth: 200 }}>Details</TableCell>
                                            <TableCell align="center" style={{ fontWeight: 700, width: 70 }}>Optional</TableCell>
                                            <TableCell align="center" style={{ fontWeight: 700, width: 100 }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rules.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" style={{ padding: 32, color: '#999' }}>
                                                    {selectedFormula
                                                        ? 'No rules yet. Click "Add Rule" to create one.'
                                                        : 'Select a formula to view its rules.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {rules.map((row, idx) => {
                                            const isEditing = !!editingRows[idx]

                                            if (isEditing && bulkEditing) {
                                                // Bulk mode: editable row WITH drag support
                                                return (
                                                    <TableRow key={`bulk-${idx}`}
                                                        draggable
                                                        onDragStart={this.onDragStart(idx)}
                                                        onDragOver={this.onDragOver(idx)}
                                                        onDragLeave={this.onDragLeave}
                                                        onDrop={this.onDrop(idx)}
                                                        onDragEnd={this.onDragEnd}
                                                        style={{
                                                            backgroundColor: '#fffde7',
                                                            borderTop: this.state.dragOverIdx === idx ? '2px solid #1976d2' : undefined,
                                                            opacity: this.state.dragIdx === idx ? 0.4 : 1,
                                                        }}
                                                    >
                                                        {/* Drag handle */}
                                                        <TableCell align="center" style={{ width: 40, cursor: 'grab', padding: '4px 0' }}>
                                                            <DragHandleIcon style={{ color: '#bbb', fontSize: 20 }} />
                                                        </TableCell>
                                                        {/* Sequence */}
                                                        <TableCell align="center" style={{ width: 50 }}>
                                                            <TextField size="small" variant="outlined" type="number"
                                                                value={editingRows[idx].sequence}
                                                                onChange={this.handleFieldChange(idx, 'sequence')}
                                                                inputProps={{ style: { textAlign: 'center', padding: '6px 4px', width: 36 } }} />
                                                        </TableCell>
                                                        {/* Component */}
                                                        <TableCell>
                                                            <TextField select size="small" variant="outlined" fullWidth
                                                                value={editingRows[idx].salary_component}
                                                                onChange={this.handleFieldChange(idx, 'salary_component')}>
                                                                {this.state.components.map(c => (
                                                                    <MenuItem key={c.id} value={c.id}>
                                                                        {c.name} {c.codename ? <span style={{ color: '#888' }}>({c.codename})</span> : ''}
                                                                    </MenuItem>
                                                                ))}
                                                            </TextField>
                                                        </TableCell>
                                                        {/* Calc Type */}
                                                        <TableCell>
                                                            <TextField select size="small" variant="outlined" fullWidth
                                                                value={editingRows[idx].calculation_type}
                                                                onChange={this.handleFieldChange(idx, 'calculation_type')}>
                                                                {CALC_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                                                            </TextField>
                                                        </TableCell>
                                                        {/* Details */}
                                                        <TableCell>
                                                            {editingRows[idx].calculation_type === 'FIXED' && (
                                                                <TextField size="small" variant="outlined" type="number" placeholder="Amount"
                                                                    value={editingRows[idx].value}
                                                                    onChange={this.handleFieldChange(idx, 'value')}
                                                                    inputProps={{ style: { padding: '6px 8px' } }} style={{ width: 100 }} />
                                                            )}
                                                            {editingRows[idx].calculation_type === 'PERCENT' && (
                                                                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                                                    <TextField size="small" variant="outlined" type="number" placeholder="%"
                                                                        value={editingRows[idx].value}
                                                                        onChange={this.handleFieldChange(idx, 'value')}
                                                                        inputProps={{ style: { padding: '6px 8px' } }} style={{ width: 70 }} />
                                                                    <Typography variant="body2" style={{ whiteSpace: 'nowrap' }}>% of</Typography>
                                                                    <TextField select size="small" variant="outlined"
                                                                        value={editingRows[idx].base_component || 'GROSS'}
                                                                        onChange={this.handleFieldChange(idx, 'base_component')}
                                                                        style={{ minWidth: 130 }}>
                                                                        <MenuItem value="GROSS">Gross Salary</MenuItem>
                                                                        {this.state.components.filter(c => !c.is_deduction).map(c => (
                                                                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                                                        ))}
                                                                    </TextField>
                                                                </Box>
                                                            )}
                                                            {editingRows[idx].calculation_type === 'EXPRESSION' && (
                                                                <TextField size="small" variant="outlined" fullWidth
                                                                    placeholder="e.g. round(BASIC * 0.12)"
                                                                    value={editingRows[idx].expression}
                                                                    onChange={this.handleFieldChange(idx, 'expression')}
                                                                    inputProps={{ style: { padding: '6px 8px', fontFamily: 'monospace', fontSize: 13 } }} />
                                                            )}
                                                            {editingRows[idx].calculation_type === 'REMAINING' && (
                                                                <Typography variant="body2" style={{ fontStyle: 'italic', color: '#888' }}>
                                                                    Auto-calculated balance
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        {/* Actions */}
                                                        <TableCell align="center">
                                                            <Tooltip title="Delete">
                                                                <IconButton size="small" onClick={() => this.handleDelete(row, idx)}>
                                                                    <DeleteOutlinedIcon fontSize="small" style={{ color: '#f44336' }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }

                                            if (isEditing) {
                                                return this.renderEditableRow(idx)
                                            }
                                            return this.renderReadOnlyRow(row, idx)
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Legend */}
                            {rules.length > 0 && (
                                <Box mt={2} display="flex" flexWrap="wrap" style={{ gap: 16 }}>
                                    {CALC_TYPES.map(t => (
                                        <Box key={t.value} display="flex" alignItems="center" style={{ gap: 4 }}>
                                            <Box style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: t.color }} />
                                            <Typography variant="caption" style={{ color: '#666' }}>{t.label}</Typography>
                                        </Box>
                                    ))}
                                    <Box display="flex" alignItems="center" style={{ gap: 4, marginLeft: 'auto' }}>
                                        <DragHandleIcon style={{ color: '#bbb', fontSize: 16 }} />
                                        <Typography variant="caption" style={{ color: '#999' }}>Drag to reorder</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Paper>

                    {/* ═══════════════════════════ LIVE PREVIEW PANEL ═══════════════════════════ */}
                    {selectedFormula && rules.length > 0 && (
                        <Paper style={{ marginTop: 16 }}>
                            <Box p={2}>
                                <Box display="flex" alignItems="center" justifyContent="space-between"
                                    style={{ cursor: 'pointer' }} onClick={this.togglePreview}>
                                    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                                        <VisibilityIcon style={{ color: '#1976d2' }} />
                                        <Typography variant="h6" style={{ fontWeight: 600, fontSize: 16 }}>
                                            Live Preview
                                        </Typography>
                                        <Chip label="Dry Run" size="small" style={{
                                            backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 500, fontSize: 10
                                        }} />
                                    </Box>
                                    <Typography variant="body2" style={{ color: '#999' }}>
                                        {this.state.previewOpen ? '▲ Collapse' : '▼ Expand'}
                                    </Typography>
                                </Box>

                                <Collapse in={this.state.previewOpen}>
                                    <Box mt={2}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={5} md={4}>
                                                <TextField select fullWidth label="Select Staff Member" variant="outlined" size="small"
                                                    value={this.state.selectedStaff}
                                                    onChange={(e) => this.setState({ selectedStaff: e.target.value })}>
                                                    <MenuItem value="" disabled>— Select Staff —</MenuItem>
                                                    {this.state.staffList.map(s => (
                                                        <MenuItem key={s.id} value={s.id}>
                                                            {s.first_name} {s.middle_name || ''} {s.last_name || ''}
                                                            {s.salary ? ` (₹${Number(s.salary).toLocaleString()})` : ''}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Grid>
                                            <Grid item>
                                                <Button variant="contained" color="primary" size="small"
                                                    startIcon={this.state.previewLoading ? <CircularProgress size={16} color="inherit" /> : <VisibilityIcon />}
                                                    onClick={this.runPreview}
                                                    disabled={!this.state.selectedStaff || this.state.previewLoading}>
                                                    {this.state.previewLoading ? 'Computing...' : 'Preview'}
                                                </Button>
                                            </Grid>
                                        </Grid>

                                        {/* Preview Results */}
                                        {this.state.previewData && (
                                            <Box mt={2}>
                                                {/* Staff info bar */}
                                                <Box display="flex" flexWrap="wrap" style={{
                                                    gap: 16, marginBottom: 12, padding: '8px 12px',
                                                    backgroundColor: '#e3f2fd', borderRadius: 6,
                                                }}>
                                                    <Typography variant="body2"><strong>Staff:</strong> {this.state.previewData.staff?.name}</Typography>
                                                    <Typography variant="body2"><strong>Gross:</strong> ₹{Number(this.state.previewData.staff?.gross || 0).toLocaleString()}</Typography>
                                                    <Typography variant="body2"><strong>Working Days:</strong> {this.state.previewData.attendance?.working_days}</Typography>
                                                    <Typography variant="body2"><strong>Present Days:</strong> {this.state.previewData.attendance?.present_days}</Typography>
                                                </Box>

                                                {/* Step-by-step results table */}
                                                <TableContainer style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                                                <TableCell style={{ fontWeight: 700, width: 40 }}>#</TableCell>
                                                                <TableCell style={{ fontWeight: 700 }}>Component</TableCell>
                                                                <TableCell style={{ fontWeight: 700 }}>Type</TableCell>
                                                                <TableCell style={{ fontWeight: 700 }}>Detail</TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700 }}>Full Value</TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700 }}>Prorated</TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700 }}>LOP</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(this.state.previewData.steps || []).map((step, i) => (
                                                                <TableRow key={i} style={{
                                                                    opacity: step.is_active ? 1 : 0.4,
                                                                    backgroundColor: step.is_deduction ? '#fff3e0' : (step.is_active ? '#fff' : '#fafafa'),
                                                                }}>
                                                                    <TableCell>{step.sequence}</TableCell>
                                                                    <TableCell>
                                                                        <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                                                                            <span style={{ fontWeight: 500 }}>{step.component}</span>
                                                                            {step.is_deduction && (
                                                                                <Chip label="Ded" size="small" style={{
                                                                                    backgroundColor: '#ffecb3', color: '#e65100',
                                                                                    fontSize: 9, height: 18, fontWeight: 600
                                                                                }} />
                                                                            )}
                                                                            {step.is_optional && (
                                                                                <Chip label="Optional" size="small" style={{
                                                                                    backgroundColor: '#e8f5e9', color: '#2e7d32',
                                                                                    fontSize: 9, height: 18, fontWeight: 600
                                                                                }} />
                                                                            )}
                                                                            {!step.is_active && (
                                                                                <Chip label="OFF" size="small" style={{
                                                                                    backgroundColor: '#ffcdd2', color: '#c62828',
                                                                                    fontSize: 9, height: 18, fontWeight: 600
                                                                                }} />
                                                                            )}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>{this.renderTypeChip(step.calculation_type)}</TableCell>
                                                                    <TableCell>
                                                                        <code style={{ fontSize: 12, backgroundColor: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>
                                                                            {step.detail}
                                                                        </code>
                                                                    </TableCell>
                                                                    <TableCell align="right" style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                                                        ₹{Number(step.full_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                    <TableCell align="right" style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                                                        ₹{Number(step.prorated_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                    </TableCell>
                                                                    <TableCell align="right" style={{ fontFamily: 'monospace', color: step.lop_amount > 0 ? '#e53935' : '#999' }}>
                                                                        {step.lop_amount > 0 ? `₹${Number(step.lop_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}

                                                            {/* Summary row */}
                                                            <TableRow style={{ backgroundColor: '#e8f5e9' }}>
                                                                <TableCell colSpan={4} align="right" style={{ fontWeight: 700 }}>
                                                                    Totals
                                                                </TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                                                                    ₹{Number(this.state.previewData.totals?.gross_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700, fontFamily: 'monospace' }}>

                                                                </TableCell>
                                                                <TableCell align="right" style={{ fontWeight: 700, fontFamily: 'monospace', color: '#e53935' }}>
                                                                    ₹{Number(this.state.previewData.totals?.total_lop || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>

                                                {/* Net Pay summary */}
                                                <Box mt={1.5} display="flex" flexWrap="wrap" style={{
                                                    gap: 24, padding: '10px 16px',
                                                    borderRadius: 6, border: '1px solid #c8e6c9',
                                                    backgroundColor: '#f1f8e9',
                                                }}>
                                                    <Typography variant="body2">
                                                        <strong>Gross Earnings:</strong>{' '}
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2e7d32' }}>
                                                            ₹{Number(this.state.previewData.totals?.gross_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Total Deductions:</strong>{' '}
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e65100' }}>
                                                            ₹{Number(this.state.previewData.totals?.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Net Pay:</strong>{' '}
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b5e20', fontSize: 15 }}>
                                                            ₹{Number(this.state.previewData.totals?.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        <strong>Total LOP:</strong>{' '}
                                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#c62828' }}>
                                                            ₹{Number(this.state.previewData.totals?.total_lop || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </Box>
                        </Paper>
                    )}
                </>)}
            </Box>
        )
    }
}

export default FormulaRule
