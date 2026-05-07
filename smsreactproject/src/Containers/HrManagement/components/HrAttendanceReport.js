import React, { Component } from "react";
import moment from "moment";


import Timeline, {
  TimelineHeaders,
  SidebarHeader,
  DateHeader
} from "react-calendar-timeline/lib";

import "react-calendar-timeline/lib/Timeline.css";
import { Box, Dialog, AppBar, Toolbar, IconButton, Typography, Slide, Button } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

// import generateFakeData from "./data";

import './styles.scss';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});


var keys = {
  groupIdKey: "id",
  groupTitleKey: "title",
  groupRightTitleKey: "rightTitle",
  itemIdKey: "id",
  itemTitleKey: "title",
  itemDivTitleKey: "title",
  itemGroupKey: "group",
  itemTimeStartKey: "start",
  itemTimeEndKey: "end",
  groupLabelKey: "title",
  fixedHeader: 'fixed',
};

var groups = [
  { id: 1, title: 'Nithin' },
  { id: 2, title: 'Yashodhar' },
  { id: 3, title: 'Nagendra' },
  { id: 4, title: 'Jay Ram' },
  { id: 5, title: 'Anand' },
  { id: 6, title: 'Puneeth' },
  { id: 7, title: 'Nikhil' },
  { id: 8, title: 'Dhanu Pasad' },
  { id: 9, title: 'Vignesh' },
  { id: 0, title: 'Dinesh' },
  { id: 10, title: 'Shiva' },
  { id: 11, title: 'Jagga' },
  { id: 12, title: 'Nithin' },
  { id: 13, title: 'Yashodhar' },
  { id: 14, title: 'Nagendra' },
  { id: 15, title: 'Jay Ram' },
  { id: 16, title: 'Anand' },
  { id: 17, title: 'Puneeth' },
  { id: 18, title: 'Nikhil' },
  { id: 19, title: 'Dhanu Pasad' },
  { id: 20, title: 'Vignesh' },
  { id: 21, title: 'Dinesh' },
  { id: 22, title: 'Shiva' },
  { id: 23, title: 'Jagga' },

]


const items = [
  {
    id: 1,
    group: 1,
    title: "P",
    start_time: moment('2021-02-01'),
    end_time: moment('2021-02-01').add(24, "hour")
  },
  {
    id: 2,
    group: 2,
    title: "P",
    start_time: moment('2021-02-09'),
    end_time: moment('2021-02-09').add(24, "hour")
  },
  {
    id: 3,
    group: 3,
    title: "A",
    start_time: moment('2021-02-09'),
    end_time: moment('2021-02-09').add(24, "hour")
  }
];


export default class HrAttendanceReport extends Component {


  constructor(props) {
    super(props);

    const visibleTimeStart = moment()
      .startOf("month")
      .valueOf();
    const visibleTimeEnd = moment()
      .startOf("month")
      .add(1, "months")
      .valueOf();

    this.state = {
      groups,
      items,
      open: false,
      // beforeTodayRemaningDays:-15,
      // afterTodayRemainingDays:15,
      visibleTimeStart,
      visibleTimeEnd
    };
  }


  handleClose = () => {
    this.setState({
      open: false
    })
  }

  handleOpen = () => {
    this.setState({
      open: true
    })
  }



  isWeekendDay = (intervalContext, data) => {
    if (data.isMonth) {
      return false;
    }
    const day = intervalContext.interval.startTime.day();
    return day === 6 || day === 0; // Saturday or Sunday
  };

  isCurrentDay = (intervalContext, data) => {
    return (
      !data.isMonth &&
      intervalContext.interval.startTime.isSame(data.currentDate, "day")
    );
  };

  componentDidMount = () => {
    let { beforeTodayRemaningDays, afterTodayRemainingDays } = this.state;

    const startOfMonth = moment().clone().startOf('month').format('D');
    const endOfMonth = moment().clone().endOf('month').format('D ');
    const today = moment().format('D');

    beforeTodayRemaningDays = `-${today - startOfMonth}`
    afterTodayRemainingDays = endOfMonth - today
    afterTodayRemainingDays = parseInt(afterTodayRemainingDays) + 1
    afterTodayRemainingDays = afterTodayRemainingDays.toString()
    this.setState({
      beforeTodayRemaningDays,
      afterTodayRemainingDays
    })

  }

  itemRenderer = ({ item, itemContext, getItemProps }) => {
    return (
      <div
        {...getItemProps({
          style: {
            display: "flex",
            alignItems: "center",
            background: item.start_time.isAfter() ? "#aaa" : "#d32f2f",
            border: `3px solid ${itemContext.selected ? "#fff700" : "transparent"
              }`,
            borderRadius: "12.5px",
            boxShadow: "rgba(0, 0, 0, 0.16) 0 0.3rem 0.6rem"
          }
        })}
      >
        <div
          style={{
            position: "sticky",
            // left: "0",
            // display: "inline-block",

            overflow: "hidden",
            padding: "0 1px",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {itemContext.title === 'P' &&
            <Box style={{ color: 'white' }}>{itemContext.title}</Box>
          }
          {itemContext.title === 'A' &&
            <Box style={{ color: 'black' }}>{itemContext.title}</Box>
          }
        </div>
      </div>
    );
  };

  intervalRenderer = ({ intervalContext, getIntervalProps, data }) => {
    return (
      <div
        {...getIntervalProps()}
        className={`rct-dateHeader ${data.isMonth ? "rct-dateHeader-primary" : ""
          }`}
        onClick={() => {

          return false;
        }}
      >
        <span
          style={{
            position: data.isMonth ? "sticky" : "static",
            // marginRight: data.isMonth ? "auto" : "inherit",
            left: "0",
            padding: "0 1rem",
            fontWeight:
              this.isWeekendDay(intervalContext, data) ||
                this.isCurrentDay(intervalContext, data)
                ? "400"
                : "300",
            color: this.isCurrentDay(intervalContext, data) ? "#d32f2f" : "#000"
          }}
        >
          {intervalContext.intervalText}
        </span>
      </div>
    );
  };

  onItemSelect = (itemId, e, time, onItemSelectParentUpdate) => {
  };

  onCanvasClick = (groupId, time, e, onCanvasClickParentUpdate) => {
  };

  onPrevClick = () => {
    let { visibleTimeEnd, visibleTimeStart } = this.state;
    const zoom = this.state.visibleTimeEnd - this.state.visibleTimeStart;
    const nextMonth = moment()
      .startOf("month")
      .add(1, "months")
      .valueOf();

    visibleTimeEnd = visibleTimeStart

    visibleTimeStart = moment(visibleTimeStart).add(-1, 'M').startOf("month").valueOf()

    this.setState(state => ({
      visibleTimeStart,
      visibleTimeEnd
    }));
  };

  onNextClick = () => {
    let { visibleTimeEnd, visibleTimeStart } = this.state;

    visibleTimeStart = visibleTimeEnd

    visibleTimeEnd = moment(visibleTimeStart).add(1, 'M').startOf("month").valueOf()

    this.setState(state => ({
      visibleTimeStart,
      visibleTimeEnd
    }));
  };

  render() {
    const { groups, items, open, beforeTodayRemaningDays, afterTodayRemainingDays, visibleTimeStart, visibleTimeEnd } = this.state;
    const currentDate = moment();
    return (
      <div>
        {/*
        <Button className='form-next-pre-button' ml={2} onClick={this.handleOpen}>
          Report
         </Button>
      */}

        <Dialog fullScreen open={open} onClose={() => this.handleClose('close')} TransitionComponent={Transition}>
          <AppBar>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={() => this.handleClose('close')} aria-label="close">
                <CloseIcon />
              </IconButton>
              <Typography variant="h6">
                Staff Attendance Report
                        </Typography>
            </Toolbar>
          </AppBar>
          <Box className='attendance-calender-box'>
            <button onClick={this.onPrevClick}>{"< Prev"}</button>
            <button onClick={this.onNextClick}>{"Next >"}</button>
            <Timeline
              scrollRef={el => (this.scrollRef = el)}
              groups={groups}
              items={items}
              sidebarContent="Resource"
              // defaultTimeStart={moment()
              // .startOf("day")
              // .add(beforeTodayRemaningDays, "day")}
              // defaultTimeEnd={moment()
              // .startOf("day")
              // .add(afterTodayRemainingDays, "day")}
              itemRenderer={this.itemRenderer}
              canResizeLeft={false}
              maxZoom={1 * 365.24 * 86400 * 1000}
              minZoom={1.24 * 86400 * 1000 * 7 * 3}
              onItemSelect={(itemId, e, time) => this.onItemSelect(itemId, e, time)}
              onCanvasClick={(groupId, time, e) =>
                this.onCanvasClick(groupId, time, e)
              }
              // stackItems={false}
              canMove={false}
              canResize={false}
              visibleTimeStart={visibleTimeStart}
              visibleTimeEnd={visibleTimeEnd}
            >
              <TimelineHeaders>
                <SidebarHeader>
                  {({ getRootProps }) => {
                    return (
                      <div {...getRootProps()} className=''>

                      </div>
                    );
                  }}
                </SidebarHeader>
                <DateHeader
                  unit="month"
                  labelFormat="MMMM YYYY"
                  headerData={{ isMonth: true, isYear: true }}
                // intervalRenderer={this.intervalRenderer}
                />
                <DateHeader
                  unit="day"
                  labelFormat="D ddd"
                  headerData={{ isMonth: false, currentDate }}
                  intervalRenderer={this.intervalRenderer}
                />
              </TimelineHeaders>
            </Timeline>
          </Box>
        </Dialog>

      </div>
    );
  }
}