import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import {ClickAwayListener, Grow, Popper, Paper, MenuItem, MenuList } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import './style.scss';
import { changeLocale } from '../actions';
import { makeSelectLocale } from '../selectors';
import { getKeyValueMap } from 'Includes/functions';

class LocaleToggle extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      selectedLanguage: 'en',
      country_code: '',
      content: [],
      anchorEl: null,
      anchorEl: null,
      isMenuOpen: false,
      isBoardMenuOpen: false,
      branchList:[],
      boardList:[],
      branch:'',
      branchKeyValue:{}
    };
    this.anchorRef = React.createRef();
    this.boardRef = React.createRef();
  }
  toggle() {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }
  onClick(branch) {
      localStorage.setItem('branch', branch);
      // this.props.onLocaleToggleNew(language);
      this.setState({branch},()=>{
        this.handleClose();
        this.props.updateComponent()
      })
  }
  onClickBoard(board) {
    localStorage.setItem('board', board);
    // this.props.onLocaleToggleNew(language);
    this.setState({board},()=>{
      this.handleCloseBoard();
      this.props.updateComponent()
    })
}
handleClose = () => {
    this.setState({ anchorEl: null, isMenuOpen:false })
  };
  handleCloseBoard = () => {
    this.setState({ anchorEl: null, isBoardMenuOpen:false })
  };
  handleMenuClose = (e, action) => {
    let anchorEl = null;
    let isMenuOpen = !this.state.isMenuOpen;
    if(action === 'close'){
        isMenuOpen = false;
    }
    if (isMenuOpen) {
        anchorEl = e.currentTarget;
    }
    this.setState({ isMenuOpen, anchorEl })

}

handleBoardMenuClose = (e, action) => {
  let anchorEl = null;
  let isBoardMenuOpen = !this.state.isBoardMenuOpen;
  if(action === 'close'){
      isBoardMenuOpen = false;
  }
  if (isBoardMenuOpen) {
    anchorEl = e.currentTarget;
  }
  this.setState({ isBoardMenuOpen, anchorEl })

}

componentDidMount=()=>{
  let{branch,board}=this.state;
  let branchList=(localStorage.getItem("branches") && localStorage.getItem("branches")!=='undefined')?JSON.parse(localStorage.getItem("branches")):[  ]
  let boardList= (localStorage.getItem("boards") && localStorage.getItem("boards")!=='undefined')?JSON.parse(localStorage.getItem("boards")):[  ]
  let selectedBranch = localStorage.getItem('branch', branch);
  branch=selectedBranch
  if(branchList.length>1){
    let temp = { id: 'all', name: 'All', code:'all' }
    branchList.unshift(temp)
    if(!localStorage.getItem('branch')){
      branch='all'
    }
  }
  if(branchList.length===1){
    if(!localStorage.getItem('branch')){
    branch=branchList[0]['id']
    localStorage.setItem('branch', branch);
  }
  }
  let branchKeyValue = getKeyValueMap(branchList, 'id', 'code')

  let selectedBoard = localStorage.getItem('board', board);
  board=selectedBoard
  if(boardList.length>1){
    let temp = { id: 'all', name: 'All', code:'all' }
    boardList.unshift(temp)
    if(!localStorage.getItem('board')){
      board='all'
    }
  }
  if(boardList.length===1){
    if(!localStorage.getItem('board')){
      board=boardList[0]['id']
    localStorage.setItem('board', board);
  }
  }
  let boardKeyValue = getKeyValueMap(boardList, 'id', 'code')
  this.setState({
    branchList,
    branchKeyValue,
    branch,
    boardList,
    boardKeyValue,
    board,
  })
}

  render() {
    const  { isMenuOpen,branchList,boardList, branch,branchKeyValue ,boardKeyValue, isBoardMenuOpen, board} = this.state;
    const { locale ,hideBranch, hideBoard} = this.props;
    const id = isMenuOpen ? 'simple-popover' : undefined;
    const idboard = isBoardMenuOpen ? 'simple-popover' : undefined;
    return (
      <>
      <div className='display-flex'>
        {branchList.length>0 && !hideBranch &&
      <div>
          <Button aria-describedby={id} variant="contained" ref={this.anchorRef} className='locale-toggle-but' color="primary" onClick={(e)=>this.handleMenuClose(e, 'check')}>
        {branchKeyValue[branch]}<i className="fa fa-caret-down lang-caret-down"></i>
        </Button>
        <Popper open={isMenuOpen} anchorEl={this.anchorRef.current} role={undefined} transition disablePortal>
          {({ TransitionProps, placement }) => (
              <Grow
                  {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
              >
              <Paper>
                <ClickAwayListener onClickAway={(e) =>this.handleMenuClose(e, 'close')}>
                    <MenuList autoFocusItem={isMenuOpen} id="menu-list-grow" >
                    {
                      branchList.map((branch, index)=>{
                        return <MenuItem key={index} onClick={()=>this.onClick(branch['id'])} className="lang-item">{branch['name']}</MenuItem>
                      })
                    }
                    </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>)}
        </Popper>
      </div>
      }
      
      {boardList.length>0 && !hideBoard &&
      <div className='pl-10'>
          <Button aria-describedby={idboard} variant="contained" ref={this.boardRef} className='locale-toggle-but' color="primary" onClick={(e)=>this.handleBoardMenuClose(e, 'check')}>
        {boardKeyValue[board]}<i className="fa fa-caret-down lang-caret-down"></i>
        </Button>
        <Popper open={isBoardMenuOpen} anchorEl={this.boardRef.current} role={undefined} transition disablePortal>
          {({ TransitionProps, placement }) => (
              <Grow
                  {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
              >
              <Paper>
                <ClickAwayListener onClickAway={(e) =>this.handleBoardMenuClose(e, 'close')}>
                    <MenuList autoFocusItem={isBoardMenuOpen} id="menu-list-grow" >
                    {
                      boardList.map((branch, index)=>{
                        return <MenuItem key={index} onClick={()=>this.onClickBoard(branch['id'])} className="lang-item">{branch['name']}</MenuItem>
                      })
                    }
                    </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>)}
        </Popper>
        
      </div>
      }
      
    </div>
      </>

      )}
}

LocaleToggle.propTypes = {
  onLocaleToggle: PropTypes.func,
  locale: PropTypes.string,
  countryData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

const mapStateToProps = createSelector(
  makeSelectLocale(),
  (locale) => ({ locale })
);
// const mapStateToProps = createStructuredSelector({
//   locale: localeSelector,
//   // countryData: makeSelectCountry(),
// });

export function mapDispatchToProps(dispatch) {
  return {
    onLocaleToggle: (evt) => dispatch(changeLocale(evt.target.value)),
    onLocaleToggleNew: (value) => dispatch(changeLocale(value)),
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(LocaleToggle);




// import React from 'react';
// import PropTypes from 'prop-types';
// import { connect } from 'react-redux';
// import { createSelector } from 'reselect';

// import {ClickAwayListener, Grow, Popper, Paper, MenuItem, MenuList } from '@material-ui/core';
// import Button from '@material-ui/core/Button';
// import './style.scss';
// import { changeLocale } from '../actions';
// import { makeSelectLocale } from '../selectors';
// import { INTL_LANGUAGES } from 'Constants';

// class LocaleToggle extends React.PureComponent {
//   constructor(props) {
//     super(props);
//     this.state = {
//       dropdownOpen: false,
//       selectedLanguage: 'en',
//       country_code: '',
//       content: [],
//       anchorEl: null,
//       isMenuOpen: false
//     };
//     this.anchorRef = React.createRef();
//   }
//   toggle() {
//     this.setState({ dropdownOpen: !this.state.dropdownOpen });
//   }
//   onClick(language) {
//       localStorage.setItem('lang', language);
//       this.props.onLocaleToggleNew(language);
//       this.handleClose();
//   }
//   handleClose = () => {
//     this.setState({ anchorEl: null, isMenuOpen:false })
//   };
//   handleMenuClose = (e, action) => {
//     let anchorEl = null;
//     let isMenuOpen = !this.state.isMenuOpen;
//     if(action === 'close'){
//         isMenuOpen = false;
//     }
//     if (isMenuOpen) {
//         anchorEl = e.currentTarget;
//     }
//     this.setState({ isMenuOpen, anchorEl })

// }
//   render() {
//     const  { isMenuOpen, } = this.state;
//     const { locale } = this.props;
//     const id = isMenuOpen ? 'simple-popover' : undefined;
    
//     return (
//       <div>
//         <Button aria-describedby={id} variant="contained" ref={this.anchorRef} className='locale-toggle-but' color="primary" onClick={(e)=>this.handleMenuClose(e, 'check')}>
//         {locale}<i className="fa fa-caret-down lang-caret-down"></i>
//         </Button>
//         <Popper open={isMenuOpen} anchorEl={this.anchorRef.current} role={undefined} transition disablePortal>
//           {({ TransitionProps, placement }) => (
//               <Grow
//                   {...TransitionProps}
//                   style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
//               >
//               <Paper>
//                 <ClickAwayListener onClickAway={(e) =>this.handleMenuClose(e, 'close')}>
//                     <MenuList autoFocusItem={isMenuOpen} id="menu-list-grow" >
//                     {
//                       Object.keys(INTL_LANGUAGES).map((lang, index)=>{
//                         return <MenuItem key={index} onClick={()=>this.onClick(lang)} className="lang-item">{INTL_LANGUAGES[lang]}</MenuItem>
//                       })
//                     }
//                     </MenuList>
//                 </ClickAwayListener>
//               </Paper>
//             </Grow>)}
//         </Popper>
        
//       </div>
//     );
//   }
// }

// LocaleToggle.propTypes = {
//   onLocaleToggle: PropTypes.func,
//   locale: PropTypes.string,
//   countryData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
// };

// const mapStateToProps = createSelector(
//   makeSelectLocale(),
//   (locale) => ({ locale })
// );
// // const mapStateToProps = createStructuredSelector({
// //   locale: localeSelector,
// //   // countryData: makeSelectCountry(),
// // });

// export function mapDispatchToProps(dispatch) {
//   return {
//     onLocaleToggle: (evt) => dispatch(changeLocale(evt.target.value)),
//     onLocaleToggleNew: (value) => dispatch(changeLocale(value)),
//     dispatch,
//   };
// }

// export default connect(mapStateToProps, mapDispatchToProps)(LocaleToggle);
