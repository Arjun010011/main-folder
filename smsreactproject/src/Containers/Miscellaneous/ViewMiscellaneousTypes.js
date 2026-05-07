import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, Tooltip} from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import InfoIcon from "@material-ui/icons/Info";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from 'Constants';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.miscellaneousType} />,
    regex: nameAndNumberRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "50",
  },
];


class ViewMiscellaneousTypes extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('miscellaneous_type', ['update', 'delete']);
    this.state = {
      loading: true,
      miscellaneousTypeList: [],
      miscellaneousTypePermission: isUserHasPermission('miscellaneous_type', 'create'),
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...messages.miscellaneousType} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (<Box>
                {tableMeta.rowData[3] ?
                  <Tooltip
                    title="Cant Edit/Delete default Miscellaneous type"
                    placement="top-start"
                    arrow
                  >
                    <InfoIcon />
                  </Tooltip>
                  :
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[1]]}
                    label={<FormattedMessage {...messages.editMiscellaneousType} />}
                    fieldDetails={fieldDetails}
                    baseClassName='action-basic-detail-width'
                    updateUrl={PUT_URL.misctype.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.misctype.api}
                    deleteType={this.deleteType}
                    enabledActions={this.permission}
                  />
                }
              </Box>
              );
            },
          }
        },
        {
          name: "code_name",
          label: "Code name",
          options: {
              filter: false,
              sort: false,
              display: false,
          }
      },
      ]
    }
  }

  componentDidMount() {
    this.getMiscellaneousTypes();
  }

  getMiscellaneousTypes = () => {
    let { miscellaneousTypeList } = this.state
    let url = GET_URL.misctype.api
    let params = { is_active: 1 }
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        miscellaneousTypeList = response.data.data
        this.setState({
          miscellaneousTypeList,
          loading: false
        })
      }
    })
  }


  deleteType = async (id) => {
    let miscType = this.state.miscellaneousTypeList
    let index = miscType.findIndex(data => data.id === id);
    miscType.splice(index, 1);
    this.setState({
      miscellaneousTypeList: [...miscType]
    })
  }

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name
    }
    return payload
  }

  updateType = (newData, id) => {
    let miscType = this.state.miscellaneousTypeList;
    for (const data of miscType) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      miscellaneousTypeList: [...miscType],
    })
    return true
  }


  render() {
    let { loading, miscellaneousTypeList, columns, miscellaneousTypePermission } = this.state;
    if (loading) {
      return <LoadingGif />
    } else {
      return (
        <Box>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading"><FormattedMessage {...messages.miscellaneousType} /></Box>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <Box className="end-flex-prop header-align">
                  {miscellaneousTypePermission &&
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.miscellaneous_type.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.miscellaneous_type.create.label}
                    </Button>
                  }
                </Box>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item md={8} xs={12}>
                <AllMUIDataTable
                  data={miscellaneousTypeList}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(ViewMiscellaneousTypes)
