import React, { Component } from 'react'
import { withRouter, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Paper, Box, Button, Grid, TextField, Tooltip } from '@material-ui/core';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';
import AssignStudentModal from 'Containers/Transport/AssignStudentModal';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, isObjectValuesEmpty, getFullName } from 'Includes/functions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import Divider from '@material-ui/core/Divider';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import Chip from '@material-ui/core/Chip';
import Avatar from '@material-ui/core/Avatar';
import { makeStyles } from '@material-ui/core/styles';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import LocationOnOutlinedIcon from '@material-ui/icons/LocationOnOutlined';
import DirectionsBusIcon from '@material-ui/icons/DirectionsBus';
import OutlinedFlagSharpIcon from '@material-ui/icons/OutlinedFlagSharp';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import _ from 'lodash';
import InfoIcon from '@material-ui/icons/Info';
import Swal from 'sweetalert2'

const grid = 12;

const useStyles = makeStyles({
	option: {
		fontSize: 15,
		'& > span': {
			marginRight: 10,
			fontSize: 18,
		},
	},
});

const reorder = (list, startIndex, endIndex) => {
	const result = Array.from(list);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);

	return result;
};

const getItems = count =>
	Array.from({ length: count }, (v, k) => k).map(k => ({
		key: `item-${k}`,
		content: `item ${k}`
	}));

const styles = theme => ({
	backdrop: {
		zIndex: theme.zIndex.drawer + 1,
		color: '#fff',
	},
});

const getItemStyle = (isDragging, draggableStyle) => ({
	// some basic styles to make the items look a bit nicer
	userSelect: "none",
	padding: `15px`,
	paddingBotton: `0px`,
	margin: `0 0 ${grid}px 0`,
	boxShadow: `rgba(149, 157, 165, 0.2) 0px 8px 24px`,
	// boxShadow: `0 1px 1px rgba(0,0,0,0.11), 
	// 0 2px 2px rgba(0,0,0,0.11), 
	// 0 4px 4px rgba(0,0,0,0.11), 
	// 0 8px 8px rgba(0,0,0,0.11), 
	// 0 16px 16px rgba(0,0,0,0.11), 
	// 0 32px 32px rgba(0,0,0,0.11`,

	// change background colour if dragging
	background: isDragging ? "#E1F0FF" : "white",

	// styles we need to apply on draggables
	...draggableStyle
});

const getListStyle = isDraggingOver => ({
	background: isDraggingOver ? "lightblue" : "#F0F5FE",
	padding: grid,
});

class RoutePlanAdd extends Component {
	constructor(props) {
		super(props);
		this.state = {
			items: [],
			routename: '',
			errors: {},
			vehicleList: [],
			selectedvehicle: 0,
			areaList: [],
			studentList: [],
			year: 0,
			yearName: '',
			showAreaDropDown: false,
			selectedArea: 0,
			submitDisable: false,
			loadingStudentModal: false,
			removedStudents: {},
			openSnackbar: false,
			alertData: '',
			isAreaListAlreadyReqstd: 0,
			isView: false,
			isEdit: false,
			selectedVehicleDetails: {},
			intialAreaListKeyValue: {},
			isDraggable: true,
			heading: 'Add Route Plan ',
			subheading: 'Here you plan route by drag and drop the cards',
			removedAreaIds: [], //only for update stores table row id instead of area id
			removedStudentIds: [], // only for update stores table row id instead of student id
			viewRouteSummary: false,
			oldSelectedVehicle: ''
		};
		this.onDragEnd = this.onDragEnd.bind(this);
		this.studentModalRef = React.createRef();
	}



	componentDidMount = () => {
		if (!this.props.location.state || !this.props.location.state.year) {
			this.props.history.push(Actions.transport_route_map.view.url)
		} else {
			this.setState({
				year: this.props.location.state.year,
				yearName: this.props.location.state.yearName
			}, () => {
				if (Actions.transport_route_map.update.url === this.props.location.pathname) {
					this.handleEditPage();
				} else if (Actions.transport_route_map_view.view.url === this.props.location.pathname) {
					this.handleViewPage();
				} else if (Actions.transport_route_map.create.url === this.props.location.pathname) {
					this.getRoutePlanData();
					this.getVehicleList();
					this.getAreas();
				} else {
					this.props.history.push(Actions.transport_route_map.view.url)
				}
			})
		}
	}

	updateFields = () => {
		let url = `${GET_URL.route.api}${this.props.location.state.detail}/`;
		let { items, selectedvehicle, selectedVehicleDetails, oldSelectedVehicle, vehicleList } = this.state;
		getRequest(url, {}, this.props).then((response) => {
			if (response && response.status === 200) {
				let tempData = response.data.data;
				if (!!tempData['routes']) {
					items = tempData['routes'];
					items.map((item)=>{
						item['pickup_time'] = (!!item['pickup_time']) ?item['pickup_time'].slice(0,5): item['pickup_time'];
						item['drop_time'] = (!!item['drop_time']) ?item['drop_time'].slice(0,5): item['drop_time'];
					})
				}
				if (!!tempData['vehicle_details']) {
					selectedvehicle = tempData['vehicle_details']['id'];
					oldSelectedVehicle = _.cloneDeep(selectedvehicle)
					selectedVehicleDetails = tempData['vehicle_details'];
					vehicleList.push({'id': selectedvehicle, 'name': selectedVehicleDetails['name']})
				}
				this.setState({ items, routename: tempData['name'], selectedvehicle,selectedVehicleDetails, oldSelectedVehicle, vehicleList })
			}
		});
	}

	handleEditPage() {
		this.setState({
			isEdit: true,
			heading: 'Edit Route Plan',
			subheading: 'Here you can edit the route plan by drag and drop',
		}, () => {
			this.getVehicleList(true)
			this.getAreas();
		})
	}

	handleViewPage() {
		this.setState({
			isView: true,
			heading: 'Route Plan View',
			subheading: 'View the Entire Route Plan',
			isDraggable: false
		}, () => {
			this.getVehicleList(true);
			this.getAreas();
		})
	}

	getRoutePlanData = () => {
	}


	getVehicleList = (updateField=false) => {
		const{year}=this.state;
		let params = { is_active: 1,academic_year:year };
		getRequest(GET_URL.vehicledriver.api, params, this.props).then((response) => {
			if (response && response.status === 200) {
				let vehicleList = response.data.data;
				this.setState({ vehicleList }, () => {
					if( updateField ){
						this.updateFields();
					}
				})
			}
		});
	}

	getAreas = () => {
		let params = { is_active: true };
		let { intialAreaListKeyValue } = this.state;
		getRequest(GET_URL.area.api, params, this.props).then((response) => {
			if (response && response.status === 200) {
				let tempAreaList = response.data.data;
				tempAreaList.forEach(element => {
					intialAreaListKeyValue[element['id']] = element;
				});
				this.setState({ intialAreaListKeyValue, areaList: tempAreaList });
			}
		});
	}

	removeExistingAreas = (areaData = []) => {
		let { areaList, items } = this.state;
		if (areaData.length != 0) {
			areaList = areaData;
		}
		let existingAreaIds = [];
		items.map((val) => {
			existingAreaIds.push(val['area']);
		})

		for (let i = 0; i < areaList.length; i++) {
			if (existingAreaIds.includes(areaList[i]['id'])) {
				areaList.splice(i, 1);
				i--;
			}
		}
		this.setState({ areaList, showAreaDropDown: true })
	}

	hideAreaDropDown = () => {
		this.setState({
			showAreaDropDown: false,
			selectedArea: 0
		})
	}

	addNewArea = () => {
		let { selectedArea, items, areaList } = this.state;
		if (selectedArea == 0) {
			this.setSnackBardata('Please select area');
		} else {
			let selectedAreaName = '';
			for (let i = 0; i < areaList.length; i++) {
				if (areaList[i]['id'] == selectedArea) {
					selectedAreaName = areaList[i]['name'];
					break;
				}
			}
			let intialRoutePlanData = {
				'area': selectedArea,
				'key': 'item-' + selectedArea,
				'area_details': { 'name': selectedAreaName },
				'totalStudents': 0,
				'students': [
				],
			}
			items.push(intialRoutePlanData);
			this.setState({ items }, () => {
				this.hideAreaDropDown();
			});

		}
	}

	getUnassignedStudentList = (index, areaData) => {
		let { year, studentList } = this.state;
		let params = { is_active: true, academic_year: year, unassigned_route: 1, area: areaData['id'] };
		this.setState({ loadingStudentModal: true });
		getRequest(GET_URL.routestudentaddress.api, params, this.props).then((response) => {
			if (response && response.status === 200) {
				studentList = {}
				studentList = this.removeExistingStudentList(response.data.data);
				this.setState({ studentList, loadingStudentModal: false }, () => {
					this.studentModalRef.current.openModal(index, areaData['name']);
				});
			}
		});
	}

	removeExistingStudentList = (studentData) => {
		let { items, removedStudents } = this.state;
		let existingStudentListIds = [];
		items.forEach((item) => {
			item.students.forEach((studentData) => {
				existingStudentListIds.push(studentData['id']);
			})
		})

		for (let i = 0; i < studentData.length; i++) {
			if (studentData[i]['id'] in removedStudents) {
				delete (removedStudents[studentData[i]['id']]);
			}
			if (existingStudentListIds.includes(studentData[i]['id'])) {
				studentData.splice(i, 1);
				i--;
				continue; //when splice we wont get index
			}
		}
		if (Object.keys(removedStudents).length != 0) {
			for (let id in removedStudents) {
				studentData.push(removedStudents[id]);
			}
		}
		return studentData;
	}


	onDragEnd(result) {
		// dropped outside the list
		if (!result.destination) {
			return;
		}
		const items = reorder(
			this.state.items,
			result.source.index,
			result.destination.index
		);

		this.setState({
			items
		});
	}

	handleChange = (e) => {
		this.setState({
			[e.target.name]: e.target.value
		})
	}

	removeArea = (index) => {
		let { items, removedAreaIds, intialAreaListKeyValue, areaList } = this.state;
		let removedArea = {};
		if ('id' in items[index]) {
			removedAreaIds.push(items[index]['id']);
		}
		if (items[index]['area'] in intialAreaListKeyValue) {
			removedArea = intialAreaListKeyValue[items[index]['area']];
		}
		items.splice(index, 1);
		if (!(Object.keys(removedArea).length === 0)) {
			areaList.push(removedArea);
		}
		this.setState({
			items, removedAreaIds, areaList
		})
	}


	addStudentDataToList = (itemIndex, studentData) => {
		let { items, removedStudents } = this.state;
		studentData['newly_added'] = true;
		let studentMergedData = items[itemIndex]['students'].concat(studentData);
		studentData.map((rowData) => {
			if (rowData['id'] in removedStudents) {
				delete (removedStudents[rowData['id']])
			}
		})
		items[itemIndex]['students'] = studentMergedData;
		this.setState({
			items
		}, () => { this.setState({ studentList: [] }) });
	}

	removeStudentData = (itemIndex, studentIndex) => {
		let { items } = this.state;
		let { removedStudents, removedStudentIds } = this.state;
		removedStudents[items[itemIndex].students[studentIndex]['id']] = items[itemIndex].students[studentIndex];
		if (!('newly_added' in items[itemIndex].students[studentIndex])) {
			removedStudentIds.push(items[itemIndex].students[studentIndex]['id']);
		}
		items[itemIndex].students.splice(studentIndex, 1);
		this.setState({
			items, removedStudents, removedStudentIds
		})
	}

	changepickupdroptime = (e, itemIndex, validate) => {
		let {items} = this.state;
		items[itemIndex][e.target.name] = e.target.value
		if( validate ){
			if( this.validteTime(true) ){
				this.setState({
					items
				})
			}
		}else{
			this.setState({
				items
			})
		}
	}

	validateAndFormatData = () => {
		this.setState({
			errors: {}
		})
		let returnResponse = { 'Result': true, 'post_data': {} }
		let { items, routename, errors, year, isEdit, selectedvehicle, intialAreaListKeyValue, oldSelectedVehicle } = this.state;
		let tempAreaData = {};
		errors = {};
		if (!!!routename) {
			errors['routename'] = 'Route Name is Mandatory';
			returnResponse['Result'] = false;
			returnResponse['Reason'] = 'Route name is mandatory';
		}
		if (!!routename) {
			for (let areaIndex = 0; areaIndex < items.length; areaIndex++) {
				errors[areaIndex]={}
				if(!items[areaIndex]['drop_time']){
					errors[areaIndex]['drop_time']=`Drop time is mandatory in ${items[areaIndex]['area_details']['name']}`
					returnResponse['Reason'] = `Drop time is mandatory in ${items[areaIndex]['area_details']['name']}`
					returnResponse['Result'] = false;
				}
				if(!items[areaIndex]['pickup_time']){
					errors[areaIndex]['pickup_time']=`Pickup time is mandatory in ${items[areaIndex]['area_details']['name']}`
					returnResponse['Reason'] = (Object.keys(errors[areaIndex]).length>1)?'Clear all error(s)':`Pickup time is mandatory in ${items[areaIndex]['area_details']['name']}`
					returnResponse['Result'] = false;
				}
			}
		}
		if (returnResponse['Result']) {
			let tempDuplicateStudentIds = [];
			let tempStudentData = {};
			if (isEdit) {
				returnResponse['post_data']['id'] = this.props.location.state.detail;
				returnResponse['post_data']['deleted_route_plan_ids'] = this.state.removedAreaIds;
				returnResponse['post_data']['deleted_student_ids'] = this.state.removedStudentIds;
				if( selectedvehicle != oldSelectedVehicle ){
					returnResponse['post_data']['deleted_vehicle_id'] = oldSelectedVehicle;
				}
			}
			returnResponse['post_data']['name'] = routename;
			returnResponse['post_data']['academic_year'] = year;
			returnResponse['post_data']['vehicle'] = selectedvehicle;
			returnResponse['post_data']['routes'] = [];
			loop1:
			for (let areaIndex = 0; areaIndex < items.length; areaIndex++) {
				tempAreaData = {};
				tempAreaData['sequence'] = areaIndex + 1;
				if (items[areaIndex]['id']) {
					tempAreaData['id'] = items[areaIndex]['id'];
				}
				tempAreaData['area'] = items[areaIndex]['area'];
				if (items[areaIndex]['area_details']) {
					returnResponse['post_data']['destination'] = items[areaIndex]['area_details']['name'];
				} else {
					returnResponse['post_data']['destination'] = intialAreaListKeyValue[items[areaIndex]['area']];
				}
				tempAreaData['pickup_time'] = items[areaIndex]['pickup_time'];
				tempAreaData['drop_time'] = items[areaIndex]['drop_time'];

				tempAreaData['students'] = [];
				for (let studentIndex = 0; studentIndex < items[areaIndex]['students'].length; studentIndex++) {
					tempStudentData = items[areaIndex]['students'][studentIndex];
					tempAreaData['students'].push(tempStudentData['id']);
					if (tempDuplicateStudentIds.includes(tempStudentData['id'])) {
						returnResponse['Reason'] = `Duplicate Student Data - ${tempStudentData['name']} in ${items[areaIndex]['area_details']['name']}`
						returnResponse['Result'] = false;
						break loop1;
					}
					tempDuplicateStudentIds.push(tempStudentData['id']);
				}
				returnResponse['post_data']['routes'].push(tempAreaData);
			}
		}
		if (returnResponse['Result'] && isObjectValuesEmpty(items)) {
			returnResponse['Result'] = false;
			returnResponse['Result'] = 'No Data to Save';
		}
		if (Object.keys(errors).length > 0) {
			this.setState({errors:errors});
		}
		return returnResponse;
	}

	validteTime = (clearError) =>{
		let {items, errors} = this.state;
		errors = {}
		let pickupTimeList = []
		let dropTimeList = []
		for (let areaIndex = 0; areaIndex < items.length; areaIndex++) {
			if( !!items[areaIndex]['pickup_time'] ){
				pickupTimeList.push(items[areaIndex]['pickup_time'])
			}
			if( !!items[areaIndex]['drop_time'] ){
				dropTimeList.push(items[areaIndex]['drop_time'])
			}
		}
		pickupTimeList = pickupTimeList.sort().reverse()
		dropTimeList = dropTimeList.sort()
		let trackPickupTime = 0;
		let trackDropTime = 0;
		for (let index=0;index<items.length;index++) {
			let item = items[index]
			if( item['pickup_time']){
				if( item['pickup_time'] != pickupTimeList[trackPickupTime] ){
					errors[index] = {'pickup_time': 'Pickup time should be greater than previous less than next stop'}
					break;
				}
				trackPickupTime++;
			}
			if( item['drop_time'] ){
				if( item['drop_time'] != dropTimeList[trackDropTime] ){
					errors[index] = {'drop_time': 'Drop time should be greater than previous less than next stop'};
					break;
				}
				trackDropTime++;
			}
		}
		this.setState({errors:errors});
		if (Object.keys(errors).length > 0) {
			return false;
		}
		return true;
	}

	setSnackBardata = (alertData, errorStatus = 'error') => {
		this.setState({
			alertData,
			errorStatus,
			openSnackbar: true
		})
	}

	handleCloseSnackBar = () => {
		this.setState({
			openSnackbar: false
		})
	}

	submit = () => {
		let response = this.validateAndFormatData();
		if (response['Result']) {
			let postData = response['post_data'];
			const url = POST_URL.route.api;
			postRequest(url, postData).then(response => {
				if (response && response.status === 200) {
					Swal.fire({
						position: 'top-end',
						type: 'success',
						title: response.data.Reason,
						showConfirmButton: false,
						timer: 1500
					}).then(
						this.props.history.push(Actions.transport_route_map.view.url)
					)
				}
			});
		} else {
			this.setSnackBardata(response['Reason']);
		}
	}

	displaySummary = () => {
		this.setState({
			viewRouteSummary: true
		})
	}

	// Normally you would want to split things out into separate components.
	// But in this example everything is just done in one place for simplicity
	render() {
		let { items, routename, errors, vehicleList, selectedvehicle, selectedArea,
			areaList, yearName, showAreaDropDown, errorStatus, openSnackbar, alertData,
			loadingStudentModal, isView, heading, subheading, selectedVehicleDetails,
			isDraggable, viewRouteSummary } = this.state
			let displayRouteSummary = 'none';
		if (viewRouteSummary) {
			displayRouteSummary = 'block';
		}
		const { classes } = this.props;
		return (
			<>
				<Paper className='min-height-85vh paper-background' style={{ backgroundSize: "120% 45%" }}>
					<Box>
						<Box pl={3} pb={2}>
							<Grid container className=''>
								<Grid item md={6} xs={12} sm={12} className='header-align'>
									<Box className='heading'>
										{heading}
									</Box>
									<Box className='sub-heading'>
										{subheading}
									</Box>
									<Box className="year-std-box mr-40">
										<Box className="academic-std-head "> For Academic Year</Box>
										<Box className="aca-std-white-background">{yearName}</Box>
									</Box>
								</Grid>
								<Grid item md={6} xs={12} >
									<Box className='header-align end-flex-prop'>
										{isUserHasPermission('transport_route_map', 'view') && <Button
											variant="contained"
											component={Link} to={Actions.transport_route_map.view.url}
											className='editbutton-view'
										><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.transport_route_map.view.label}</Button>}
									</Box>
								</Grid>
							</Grid>
						</Box>
						<Box pl={3} pr={3}>
							<Divider />
						</Box>
						<Box>
						</Box>
						<Box >
							<Grid container justify='center'>
								{!isView ? (
									<Grid item xl={4} lg={6} md={9} sm={12} pl={3}>
										<Box display="flex" flex="wrap" mt={3} mb={3} justifyContent='center'>
											<Box>
												<TextField
													id='route-name'
													label='Route Name'
													name='routename'
													value={routename}
													className=''
													variant="outlined"
													inputProps={{ maxLength: 50 }}
													helperText={errors['routename'] ? errors['routename'] : ''}
													error={errors['routename'] ? true : false}
													onChange={(e) => this.handleChange(e)}
												/>

											</Box>
											<Box ml={3}>
												<Dropdown
													data={vehicleList}
													name='selectedvehicle'
													value={selectedvehicle}
													onChange={this.handleChange}
													label='Assign vehicle'
													fullWidth
												/>
											</Box>
										</Box>
									</Grid>
								) : (
										<Grid item xl={5} lg={8} md={9} sm={12} pl={3}>
											<Box display="flex" justifyContent='center' mb={2}>
												<Box className="year-std-box mr-40">
													<Box className="academic-std-head "> Route Name</Box>
													<Box className="aca-std-white-background">{routename}</Box>
												</Box>
												<Box className="year-std-box mr-40">
													<Box className="academic-std-head "> Assigned Vehicle</Box>
													<Box className="aca-std-white-background">{(selectedVehicleDetails && selectedVehicleDetails['name']) ? selectedVehicleDetails['name'] :
														<Box ml={2} mr={2}> - </Box>}</Box>
												</Box>
											</Box>
										</Grid>
									)}
							</Grid>
							<Grid container justify='center'>
								<Grid item xl={4} lg={6} md={9} sm={12} xs={12} pl={3}>
									Ride Starts From School
									{items.length > 0 &&
										<DragDropContext onDragEnd={this.onDragEnd} className="margin-top-20" >
											<Droppable droppableId="droppable">
												{(provided, snapshot) => (
													<div
														{...provided.droppableProps}
														ref={provided.innerRef}
														style={getListStyle(snapshot.isDraggingOver)}
														className='p-25'
													>
														{items.map((item, index) => (
															<Draggable key={'key_' + index} draggableId={'item_' + index} index={index} isDragDisabled={!isDraggable}>
																{(provided, snapshot) => (
																	<div
																		ref={provided.innerRef}
																		{...provided.draggableProps}
																		{...provided.dragHandleProps}
																		style={getItemStyle(
																			snapshot.isDragging,
																			provided.draggableProps.style,
																		)}
																		className='position-relative'
																	>
																		<Box position='absolute' style={{left: '-5px', color: '#c3bfbf', top: 0, cursor: 'grabbing'}}><DragIndicatorIcon /></Box>
																		{(index != (items.length - 1) || items.length == 1) &&
																			<div className="float-right route-mapping-source-background">
																				{'Stop' + (parseInt(index) + 1)}
																			</div>
																		}
																		{(index == (items.length - 1) && items.length > 1) &&
																			<div className="float-right route-mapping-source-background"> Destination</div>
																		}
																		<div className='ml-5'>
																			<Box display="flex">
																				<div className='area-head-heading'> {item['area_details']['name']} </div>
																				<LocationOnOutlinedIcon className='fs-18' />
																			</Box>
																			<Box mb={2} className='student-list-route-plan'>
																				{
																					item.students.map((studentData, studentIndex) => {
																						return <Box mt={1} mr={2} key={studentIndex}>
																							{
																							isView ?
																								<Chip
																									avatar={<Avatar alt="Natacha" src="" />}
																									label={getFullName(studentData.first_name, studentData.middle_name, studentData.last_name)}
																									variant="outlined"
																									className="mr-13"
																								/>
																							:
																								<Chip
																									avatar={<Avatar alt="Natacha" src="" />}
																									label={getFullName(studentData.first_name, studentData.middle_name, studentData.last_name)}
																									variant="outlined"
																									className="mr-13"
																									onDelete={() => this.removeStudentData(index, studentIndex)}
																								/>
																							}																						</Box>
																					})
																				}
																			</Box>
																			{!isView ? (
																				<>
																					<Divider />
																					<Box className='routeplan-card-bottom' style={{placeItems: 'center'}}>
																						<PersonAddIcon onClick={() => this.getUnassignedStudentList(index, item['area_details'])} className='pointer' />
																						<Box ml={2}>
																							<TextField
																								id="time"
																								label=""
																								type="time"
																								name='drop_time'
																								defaultValue={item.drop_time}
																								onChange={(e) => this.changepickupdroptime(e, index)}
																								onBlur={(e) => this.changepickupdroptime(e, index, true)}
																								onClose={(e) => this.changepickupdroptime(e, index)}
																								InputLabelProps={{
																									shrink: true,
																								}}
																								inputProps={{
																									step: 300, // 5 min
																								}}
																								helperText='drop time'
																								error={(errors[index] && errors[index]['drop_time']) ? true : false}
																							/>
																							{errors[index] && errors[index]['drop_time'] &&
																								<Tooltip title={errors[index]['drop_time']}
																										enterDelay={400}
																										enterNextDelay={400} placement='top-start'
																										classes={{ tooltip: 'tooltip-show-data' }}>
																										<InfoIcon className='time-table-info-icon cursor-pointer' />
																								</Tooltip>
																							}
																							<TextField
																								id="time"
																								label=""
																								type="time"
																								name='pickup_time'
																								defaultValue={item.pickup_time}
																								onChange={(e) => this.changepickupdroptime(e, index)}
																								onBlur={(e) => this.changepickupdroptime(e, index, true)}
																								onClose={(e) => this.changepickupdroptime(e, index)}
																								InputLabelProps={{
																									shrink: true,
																								}}
																								inputProps={{
																									step: 300, // 5 min
																								}}
																								className='ml-20'
																								helperText='pickup time'
																								error={(errors[index] && errors[index]['pickup_time']) ? true : false}
																							/>
																							{errors[index] && errors[index]['pickup_time'] &&
																								<Tooltip title={errors[index]['pickup_time']}
																										enterDelay={400}
																										enterNextDelay={400} placement='top-start'
																										classes={{ tooltip: 'tooltip-show-data' }}>
																										<InfoIcon className='time-table-info-icon cursor-pointer' />
																								</Tooltip>
																							}
																						</Box>
																						<DeleteOutlineIcon onClick={() => this.removeArea(index)} className='margin-left-auto error-content pointer' />
																					</Box>
																				</>
																			): <>
																				<Box display='flex'>
																					<Box mr={2}><b>Pickup Time: </b>{item.pickup_time}</Box>
																					<Box><b>Drop Time:</b> {item.drop_time}</Box>
																				</Box>
																			</>
																			}
																		</div>
																	</div>
																)}
															</Draggable>
														))}
														{provided.placeholder}
													</div>
												)}
											</Droppable>
										</DragDropContext>
									}
									<Box display={displayRouteSummary}>
										<DirectionsBusIcon />
										<Box className='map-list-outer-box' mb={2}>
											{items.map((data, index) => {
												return (
													<Box display="flex" alignItems="center" key={index}>
														<Box className='arrow-right' > </Box>
														<Box ml={2}>{data['area_details']['name']}</Box>
													</Box>
												)
											})
											}
										</Box>
										<OutlinedFlagSharpIcon />

									</Box>

									{!isView && (
										<Box display="flex" justifyContent="flex-end">
											{showAreaDropDown ?
												<Box display="flex" mt={2} className={isView ? 'area-cards-view': 'area-cards'} alignItems='center'>
													<Dropdown
														data={areaList}
														name='selectedArea'
														value={selectedArea}
														onChange={this.handleChange}
														label='Select area'
														fullWidth
													/>
													<Box ml={2}>
														<Button variant="outlined" color="primary" onClick={() => this.addNewArea()}>
															Add
														</Button>
													</Box>
													<Box ml={2}>
														<Button variant="outlined" color="secondary" onClick={() => this.hideAreaDropDown()}>
															Discard
														</Button>
													</Box>
												</Box>
												:
												<Box mt={2}>
													<Button variant="outlined" onClick={() => this.removeExistingAreas()}>Add {items.length > 0 ? 'New' : ''} Area</Button>
												</Box>
											}
										</Box>
									)}
									{!isView && (
										<Box className='end-flex-prop  width-100'>
											<Box pl="4">
												<Button variant="contained" color="primary"
													className='submit'
													disabled={this.state.submitDisable}
													onClick={() => this.submit()}>
													Submit &nbsp;{' '}
												</Button>
											</Box>
										</Box>
									)
									}
									<AssignStudentModal ref={this.studentModalRef} studentList={this.state.studentList}
										addStudentDataToList={this.addStudentDataToList} />
									<Backdrop className={classes.backdrop} open={loadingStudentModal}>
										<CircularProgress color="inherit" />
									</Backdrop>
								</Grid>
							</Grid>
							<Grid container justify='center' >
								<Grid item xl={6} lg={8} md={9} sm={12} className="dropable-card">
									{/* <Box fontWeight="bold">
										Bus Stops
									</Box> */}

								</Grid>
							</Grid>
						</Box>
					</Box>

				</Paper>
				<Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
					<Alert onClose={(e) => this.handleCloseSnackBar(e)} severity={errorStatus}>
						{alertData}
					</Alert>
				</Snackbar>
			</>
		);
	}
}

export default withRouter(withStyles(styles)(RoutePlanAdd))
