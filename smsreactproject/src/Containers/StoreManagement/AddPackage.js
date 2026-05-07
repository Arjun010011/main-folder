import React, { Component } from "react";
import {
  Paper, Box, Grid, Button, TextField, Typography, IconButton
} from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";

import AddStockItemStore from "Containers/StoreManagement/Components/AddStockItemStore";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";

class AddPackageWithItemSelection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      items: [],
    };
    this.stockItemModalRef = React.createRef();
  }

  handleAddItem = () => {
    this.stockItemModalRef.current.openModal();
  };

  handleSelectedItems = (selectedItems) => {
    const newItems = [...this.state.items];
    selectedItems.forEach((item) => {
      if (!newItems.find((i) => i.id === item.id)) {
        newItems.push({ ...item, quantity: 1,unit_price: item.current_selling_price || 0});
      }
    });
    this.setState({ items: newItems });
  };

  handleRemoveItem = (index) => {
    const { items } = this.state;
    items.splice(index, 1);
    this.setState({ items });
  };

  handleChange = (e, index) => {
    const { name, value } = e.target;
    const { items } = this.state;
    items[index][name] = value;
    this.setState({ items });
  };

  handleSubmit = () => {
    const { name, items } = this.state;
    if (!name) return Swal.fire("Error", "Package name is required", "error");
    if (!items.length) return Swal.fire("Error", "Please select at least one item", "error");

    const payload = {
      name,
      description: "",  // optional
      items: items.map((item) => ({
        stock: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };

    postRequest(POST_URL.package_add, payload, this.props).then((response) => {
      if (response?.status === 200) {
        Swal.fire("Success", response.data.Reason || "Package saved", "success");
        this.props.history.push("/packages");
      }
    });
  };

  render() {
    const { name, items, description } = this.state;

    return (
      <Paper className="p-20px m-t-20px">
        <Typography variant="h5">Add Package</Typography>
        <Grid container spacing={2} style={{ marginTop: 16 }}>
          <Grid item xs={12} md={4}>
            <Box mb={2}>
              <TextField
                label="Package Name"
                value={name}
                onChange={(e) => this.setState({ name: e.target.value })}
                required
                fullWidth
              />
            </Box>
            <Box mt={2}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => this.setState({ description: e.target.value })}
                fullWidth
              />
            </Box>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={this.handleAddItem}
          >
            Select Item
          </Button>
        </Box>

        {items.length > 0 && (
          <Box mt={2}>
            <table className="selectable-row-table full-width">
              <thead>
                <tr>
                  <th>Stock Item</th>
                  <th>Category - Sub Category</th>
                  <th>Property</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i}>
                    <td>{row.item_name}</td>
                    <td>{row.category_name} - {row.sub_category_name}</td>
                    <td>
                      {(row.property_value || []).map((p) => (
                        <span key={p.id}>{p.name}, </span>
                      ))}
                    </td>
                    <td>
                      <TextField
                        name="quantity"
                        value={row.quantity}
                        onChange={(e) => this.handleChange(e, i)}
                        className="width-100-px"
                      />
                    </td>
                    <td>
                      <TextField
                        name="unit_price"
                        value={row.unit_price}
                        onChange={(e) => this.handleChange(e, i)}
                        className="width-100-px"
                      />
                    </td>
                    <td>
                      <IconButton onClick={() => this.handleRemoveItem(i)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        <Box mt={3} textAlign="right">
          <Button variant="contained" color="primary" onClick={this.handleSubmit}>
            Save Package
          </Button>
        </Box>

        <AddStockItemStore
          ref={this.stockItemModalRef}
          selectedItem={this.handleSelectedItems}
          selectedItems={items}
        />
      </Paper>
    );
  }
}

export default withRouter(AddPackageWithItemSelection);
