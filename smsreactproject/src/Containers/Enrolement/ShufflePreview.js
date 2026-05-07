import React from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@material-ui/core";

const ShufflePreview = ({ previewData }) => {
  if (!previewData || !previewData.students) return null;

  return (
    <Box>
      {previewData.students.map((stu, idx) => (
        <Paper key={idx} className="mb-20 p-20">
          <Typography variant="h6">{stu.student_name}</Typography>
          <Typography variant="body2" color="textSecondary">
            From Section: {stu.from_section} → To Section: {stu.to_section}
          </Typography>

          {/* Movable Marks */}
          {stu.movable_marks.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1">Movable Marks</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Exam</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>From Schedule</TableCell>
                    <TableCell>To Schedule</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stu.movable_marks.map((mark, i) => (
                    <TableRow key={i}>
                      <TableCell>{mark.exam_name || mark.exam}</TableCell>
                      <TableCell>{mark.subject_name}</TableCell>
                      <TableCell>{mark.from_schedule_id}</TableCell>
                      <TableCell>{mark.to_schedule_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Skipped Marks */}
          {stu.skipped_marks.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" color="error">
                Skipped Marks
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Exam</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>From Schedule</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stu.skipped_marks.map((mark, i) => (
                    <TableRow key={i}>
                      <TableCell>{mark.exam_name || mark.exam}</TableCell>
                      <TableCell>{mark.subject_name}</TableCell>
                      <TableCell>{mark.from_schedule_id}</TableCell>
                      <TableCell>{mark.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default ShufflePreview;
