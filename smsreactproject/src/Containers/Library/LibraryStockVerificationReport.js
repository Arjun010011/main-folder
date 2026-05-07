import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { getRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import { GET_URL } from "Includes/urls";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { options } from "Constants";
import { dateFormat } from "Includes/functions";

const LibraryStockVerificationReport = () => {
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [verificationForList, setVerificationForList] = useState([]);
  const [selectedVerificationFor, setSelectedVerificationFor] = useState("");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState(dateFormat(new Date(), "YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dateFormat(new Date(), "YYYY-MM-DD"));
  const [verifiedRows, setVerifiedRows] = useState([]);
  const [totalVerified, setTotalVerified] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);

  const columns = [
    { name: "id", label: "Id", options: { display: false, filter: false, sort: false } },
    { name: "bar_code", label: "Book #", options: { filter: true, sort: true } },
    { name: "book_title", label: "Book Title", options: { filter: true, sort: true } },
    { name: "verified_date", label: "Verified Date", options: { filter: true, sort: true } },
    { name: "verified_by_name", label: "Verified By", options: { filter: true, sort: true } },
    { name: "remarks", label: "Remarks", options: { filter: true, sort: true } },
  ];

  const fetchParents = async () => {
    const response = await getRequest(GET_URL.librarystockverificationparent.api, { is_active: 1 });
    if (response && response.status === 200) {
      const list = response.data.data || [];
      setVerificationForList(list);
      if (!selectedVerificationFor && list.length) {
        setSelectedVerificationFor(list[0]);
      }
    }
  };

  const fetchTotalBooks = async () => {
    const response = await getRequest(GET_URL.librarybookcopy.api, { pageno: 1, limit: 1, is_active: 1 });
    if (response && response.status === 200) {
      setTotalBooks(response?.data?.data?.count || 0);
    }
  };

  const fetchVerifiedRows = async () => {
    if (!selectedVerificationFor?.id) {
      setVerifiedRows([]);
      setTotalVerified(0);
      return;
    }
    setTableLoading(true);
    const params = {
      stock_verification_parent: selectedVerificationFor.id,
      is_active: 1,
      pageno: 1,
      limit: 5000,
      sort_by: "-created",
    };
    const response = await getRequest(GET_URL.librarystockverification.api, params);
    if (response && response.status === 200) {
      const list = response?.data?.data?.data_list || [];
      setVerifiedRows(list);
      setTotalVerified(response?.data?.data?.count || list.length);
    }
    setTableLoading(false);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchParents(), fetchTotalBooks()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    fetchVerifiedRows();
  }, [selectedVerificationFor]);

  const filteredRows = useMemo(() => {
    const term = (searchText || "").trim().toLowerCase();
    if (!term) return verifiedRows;
    return verifiedRows.filter((row) => {
      const code = (row.bar_code || "").toLowerCase();
      const title = (row.book_title || "").toLowerCase();
      return code.includes(term) || title.includes(term);
    });
  }, [verifiedRows, searchText]);

  const exportCSV = () => {
    const rows = filteredRows || [];
    const data = [
      ["Book #", "Book Title", "Verified Date", "Verified By", "Remarks"],
      ...rows.map((r) => [
        r.bar_code || "",
        r.book_title || "",
        r.verified_date || "",
        r.verified_by_name || "",
        r.remarks || "",
      ]),
    ];
    const csv = data.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "LibraryStockVerificationReport.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <LoadingGif />;

  const missingCount = Math.max((totalBooks || 0) - (totalVerified || 0), 0);

  return (
    <Box>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <div className="d-flex align-items-center flex-wrap">
              <Button
                variant="outlined"
                color="primary"
                component={Link}
                to={Actions.library_stock_verifiction.view.url}
                startIcon={<ArrowBackIcon />}
                disabled={tableLoading}
                className="mr-10"
              >
                Back
              </Button>
              <Box className="heading">Library Stock Verification Report</Box>
            </div>
          </Grid>
          <Grid item md={4} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                color="primary"
                className="editbutton-view"
                onClick={exportCSV}
                disabled={tableLoading}
              >
                Export Excel
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={2} className="margin-top-30">
          <Grid item xs={12} md={3}>
            <DropDownWithSearch
              id="select_verification_parent_report"
              options={verificationForList}
              value={selectedVerificationFor}
              optionValue="name"
              name="select_verification_parent_report"
              label="Verification For"
              disabled={tableLoading}
              onChange={(e, val) => setSelectedVerificationFor(val)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              type="date"
              label="From"
              value={startDate}
              fullWidth
              disabled={tableLoading}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              type="date"
              label="To"
              value={endDate}
              fullWidth
              disabled={tableLoading}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Search by book # / title"
              value={searchText}
              disabled={tableLoading}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Grid>
        </Grid>

        {tableLoading && (
          <Box display="flex" alignItems="center" mt={1} mb={1}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
              Loading verification data...
            </Typography>
          </Box>
        )}

        <Grid container spacing={2} style={{ marginTop: 8 }}>
          <Grid item xs={12} md={4}>
            <Paper style={{ padding: 16, border: "1px solid #e5e7eb" }}>
              <Typography variant="h5" style={{ fontWeight: 700 }}>{totalBooks}</Typography>
              <Typography variant="body2" color="textSecondary">Total Books</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper style={{ padding: 16, border: "1px solid #e5e7eb" }}>
              <Typography variant="h5" style={{ fontWeight: 700 }}>{totalVerified}</Typography>
              <Typography variant="body2" color="textSecondary">Verified</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper style={{ padding: 16, border: "1px solid #e5e7eb" }}>
              <Typography variant="h5" style={{ fontWeight: 700 }}>{missingCount}</Typography>
              <Typography variant="body2" color="textSecondary">Missing</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container className="header-align mt-20">
          <Grid item xs={12}>
            <AllMUIDataTable
              title={tableLoading ? <CircularProgress size={22} /> : ""}
              data={filteredRows}
              columns={columns}
              options={{ ...options, filter: false, selectableRows: "none" }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LibraryStockVerificationReport;
