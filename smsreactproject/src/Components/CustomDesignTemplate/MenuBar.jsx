import React, { useState,useMemo,useEffect } from 'react';
import './Canvas.css'

const deleteElement= (itemId,droppedItems,setDroppedItems) => {
  console.log(itemId)
  const element=document.getElementById(itemId);
  console.log(element)
  element.remove();
  const updatedItems = droppedItems.filter(item => item.id !== itemId);
  setDroppedItems(updatedItems)
  localStorage.setItem("droppedItems", JSON.stringify(updatedItems));
}

const addRow = (itemId,droppedItems,setDroppedItems) => {
    droppedItems.map((item => {
      if(item['id']==itemId){
        item['row']=item['row']+1;
      }
    }))
  setDroppedItems(droppedItems)
  localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
}

const addColumn = (itemId,droppedItems,setDroppedItems) => {
  droppedItems.map((item => {
    if(item['id']==itemId){
      item['column']=item['column']+1;
    }
  }))
  setDroppedItems(droppedItems)
  localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
}

const deleteRow = (itemId,droppedItems,setDroppedItems) => {
  droppedItems.map((item => {
    if(item['id']==itemId){
      if(item['row'] == 1){
        item['row']=item['row']-1;
        deleteElement(itemId,droppedItems,setDroppedItems)
      }
      else item['row']=item['row']-1;
    }
  }))
  setDroppedItems(droppedItems)
  localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
}

const deleteColumn = (itemId,droppedItems,setDroppedItems) => {
  droppedItems.map((item => {
    if(item['id']==itemId){
      if(item['column'] == 1){
        item['column']=item['column']-1;
        deleteElement(itemId,droppedItems,setDroppedItems)
      }
      else item['column']=item['column']-1;
    }
  }))
  setDroppedItems(droppedItems)
  localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
}

const enableResize = (itemId,droppedItems,setDroppedItems) => {
  const element = document.getElementById(itemId);
  console.log(element)
  if (!element) return;

  element.style.position = 'relative';
  element.style.resize = 'none';
  element.style.overflow = 'auto';
  element.style.boxSizing = 'border-box';

  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  // Create the resizer
  const resizer = document.createElement('div');
  resizer.style.width = '10px';
  resizer.style.height = '10px';
  resizer.style.background = 'red';
  resizer.style.position = 'absolute';
  resizer.style.bottom = '0';
  resizer.style.right = '0';
  resizer.style.cursor = 'se-resize';
  resizer.style.zIndex = '100';

  element.appendChild(resizer);
  
  resizer.addEventListener('mousedown', (e) => {
    console.log('here')
    e.preventDefault();
    e.stopPropagation();

    isResizing = true;
    element.style.pointerEvents = 'none'; // Prevent movement during resizing
    startX = e.clientX;
    startY = e.clientY;
    startWidth = element.clientWidth;
    startHeight = element.clientHeight;
    document.addEventListener('mousemove', resizeElement);
    document.addEventListener('mouseup', stopResize);
    console.log(droppedItems)
  });

  const resizeElement = (e) => {

    if (!isResizing) return;

    // Update width and height only
    console.log(itemId)

    element.style.width.replace('px','');
    element.style.height.replace('px','')
    element.style.width = `${startWidth + (e.clientX - startX)}px`;
    element.style.height = `${startHeight + (e.clientY - startY)}px`;
    droppedItems.map((item => {
      if(item['id']==itemId){
        item['width']=element.style.width;
        item['height']=element.style.height;
        
      }
    }))
    setDroppedItems(droppedItems)
    localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
  };

  const stopResize = () => {
    isResizing = false;
    element.style.pointerEvents = 'auto'; // Re-enable movement
    document.removeEventListener('mousemove', resizeElement);
    document.removeEventListener('mouseup', stopResize);
    // Remove the resizer div after resizing
    if (resizer && resizer.parentNode) {
      resizer.parentNode.removeChild(resizer);
    }
  };
};

const FontEditor = ({ itemId, setFontEdit, droppedItems, setDroppedItems }) => {
  const thisItem = useMemo(() => droppedItems.find((item) => item.id === itemId) || {}, [itemId, droppedItems]);
  const type = thisItem.type || "";

  const [fontSize, setFontSize] = useState("16px");
  const [fontWeight, setFontWeight] = useState("normal");
  const [fontStyle, setFontStyle] = useState("normal");
  const [fontColor, setFontColor] = useState("black");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [borderColor, setBorderColor] = useState("");
  const [borderSize, setBorderSize] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [minHeight, setMinHeight] = useState("");
  const [thbackgroundColor, setthbackgroundColor]=useState("")
  const [tbbackgroundColor,settbbackgroundColor]=useState("")
  const [tbfontSize,settbfontSize]=useState("")
  const [thfontSize,setthfontSize]=useState("")
  const [position, setPosition] = useState({ top: 100, left: 100 });
  const [fontFamily,setFontFamily]= useState("");
  const [borderRadius,setBorderRadius] = useState("")
  const [traverse,setTraverse]=useState(false);

  const fontFamilies = [
    "'Times New Roman', serif",
      "'Roboto', sans-serif",
      "'Open Sans', sans-serif",
      "'Poppins', sans-serif",
      "'Montserrat', sans-serif",
      "'Lato', sans-serif",
      "'Dancing Script', cursive",
      "'Lobster', cursive",
      "'Kaushan Script', cursive",
      "'Satisfy', cursive",
      "'Pacifico', cursive",
      "'Great Vibes', cursive",
      "'IBM Plex Mono', monospace",
      "'Fira Code', monospace",
      "'Source Code Pro', monospace"
  ];

  useEffect(() => {
    const handleClick = (e) => {
      setPosition({ top: e.pageY, left: e.pageX });
    };

    document.addEventListener("click", handleClick, { once: true });

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    setFontSize(thisItem.fontsize || "16px");
    setFontWeight(thisItem.fontweight || "normal");
    setFontStyle(thisItem.fontstyle || "normal");
    setFontColor(thisItem.fontcolor || "black");
    setBackgroundColor(thisItem.backgroundcolor || "");
    setBorderColor(thisItem.bordercolor || "");
    setBorderSize(thisItem.bordersize || "");
    setHeight(thisItem.height || "");
    setWidth(thisItem.width || "");
    setMinHeight(thisItem.minheight || "");
    setthbackgroundColor(thisItem.thbackgroundcolor || "");
    settbbackgroundColor(thisItem.tbbackgroundcolor || "");
    setthfontSize(thisItem.thfontsize|| "");
    settbfontSize(thisItem.tbfontsize||"");
    setFontFamily(thisItem.fontfamily||"");
    setBorderRadius(thisItem.borderradius||"");
    setTraverse(thisItem.traverse||false);
  }, [thisItem]);

  const applyChanges = () => {
    console.log('traverse',traverse)
    const updatedItems = droppedItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            fontsize: fontSize,
            fontweight: fontWeight,
            fontstyle: fontStyle,
            fontcolor: fontColor,
            fontfamily:fontFamily,
            backgroundcolor: backgroundColor,
            bordercolor: borderColor,
            bordersize: borderSize,
            height: height ? `${height}` : "",
            width: width ? `${width}` : "",
            minheight: minHeight ? `${minHeight}` : "",
            thbackgroundcolor:thbackgroundColor,
            tbbackgroundcolor:tbbackgroundColor,
            thfontsize:thfontSize,
            tbfontsize:tbfontSize,
            borderradius:borderRadius ? borderRadius :"",
            traverse:traverse,
          }
        : item
    );
    setDroppedItems(updatedItems);
    localStorage.setItem("droppedItems", JSON.stringify(updatedItems));
    setFontEdit(false);
  };

  return (
    <div className='editBox'
      style={{
        position: "absolute",
        top: position.top , // Slight offset to avoid overlap
        left: position.left ,
        backgroundColor: "white",
        padding:'10px',
        boxShadow: "0px 0px 10px rgba(0,0,0,0.2)",
        borderRadius: "5px",
        zIndex: 1000,
        textAlign:'left',
        width: "250px",
        border:'1px solid black'
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",backgroundColor:'blue',color:'white',borderTopLeftRadius:'10px',borderTopRightRadius:'10px' }}>
        <h3>Edit {type}</h3>
        <button
          onClick={() => setFontEdit(false)}
          style={{ background: "red", color: "white", border: "none", cursor: "pointer",width:'40px',borderRadius:'4px' ,height:'100%'}}
        >
          X
        </button>
      </div>

      {type.includes("Label") && (
        <>
          <label>Font Size:</label><br/>
          <input type="number" value={parseInt(fontSize)} onChange={(e) => setFontSize(`${e.target.value}px`)} /><br/>
          <label>Font Weight:</label><br/>
          <select value={fontWeight} onChange={(e) => setFontWeight(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Lighter</option>
          </select><br/>
          <label>Font Style:</label><br/>
          <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select><br/>
          <label>Font Color:</label>
          <input  type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} /><br/>
          
        </>
      )}

      {(type === "Box" || type === "Circle" || type === "Table" || type === "ValueTable") && (
        <>
          <label>Background Color:</label>
          <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} /><br/>
          <label>Border Color:</label>
          <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} /><br/>
          <label>Border Size:</label><br/>
          <input type="number" value={parseInt(borderSize)} onChange={(e) => setBorderSize(`${e.target.value}px`)} /><br/>
        </>
      )}

      {type === "ValueTable" && (
        <>
          <label>Minimum height of header:</label><br/>
          <input type="number" value={parseInt(minHeight)} onChange={(e) => setMinHeight(`${e.target.value}px`)} /><br/>
          <label htmlFor="">Table Header color</label>
          <input type="color" value={thbackgroundColor} onChange={(e) => setthbackgroundColor(e.target.value)} /><br/>
          <label>Header font Size:</label><br/>
          <input type="number" value={parseInt(thfontSize)} onChange={(e) => setthfontSize(`${e.target.value}px`)} /><br/>
          <label htmlFor="">Table Body color</label>
          <input type="color" value={tbbackgroundColor} onChange={(e) => settbbackgroundColor(e.target.value)} /><br/>
          <label>Body font Size:</label><br/>
          <input type="number" value={parseInt(tbfontSize)} onChange={(e) => settbfontSize(`${e.target.value}px`)} /><br/>
          <label htmlFor="">Travese</label>
          <input type="checkbox" value={traverse} onChange={(e) => setTraverse(!traverse)} /><br/>
        </>
      )}

      {type === "ValueLabel" && (
        <>
          <label>Width:</label><br/>
          <input type="number" value={parseInt(width)} onChange={(e) => setWidth(e.target.value)} /><br/>
          <label>Height:</label>
          <input type="number" value={parseInt(height)} onChange={(e) => setHeight(e.target.value)} />
        </>
      )}

      {type === "Line" && (
        <>
          <label>Color:</label>
          <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
        </>
      )}
      {(type === "Label" || type === "ValueLabel" || type === "ValueTable") && (
        <><label >Select a Font</label>
            <select 
                value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
            >
                {fontFamilies.map((font, index) => (
                    <option key={index} value={font} style={{ fontFamily: font }}>
                        {font}
                    </option>
                ))}
            </select>
            </>
            )
      }
      {(type == "Image" || type == "ValueImage") && (
        <>
        <label>Border Radius </label><br/>
        <input type="number" value={parseInt(borderRadius)} onChange={(e) => setBorderRadius(`${e.target.value}px`)} /><br/>
        <label>Background Color:</label>
        <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} /><br/>
          <label>Border Color:</label>
          <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} /><br/>
          <label>Border Size:</label><br/>
          <input type="number" value={parseInt(borderSize)} onChange={(e) => setBorderSize(`${e.target.value}px`)} /><br/>
        </>
      )}

      <br/><button onClick={applyChanges}>Apply</button>
    </div>
  );
};





const rotate90deg = (itemId, droppedItems, setDroppedItems ) => {
  console.log('oj',droppedItems,itemId)
  const updatedItems = droppedItems.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        rotation: (item.rotation || 0) + 90 // Initialize if missing
      };
    }
    return item;
  });

  setDroppedItems(updatedItems);
  localStorage.setItem("droppedItems", JSON.stringify(updatedItems));
};


const MenuBar = ({ menuVisible, menuType, menuRef, menuPosition, itemId, setMenuVisible, droppedItems, setDroppedItems, handleLabelClick, onFieldSelect }) => {
  const [fontEdit, setFontEdit] = useState(false);

  const menuOptions = {
    Image: ["Resize", "Change Image","Select Data Field", "More ...", "Delete"],
    ValueImage: ["Resize", "Select Data Field", "More ...", "Delete"],
    Table: ["Resize", "Add Row", "Add Column", "Delete Row", "Delete Column","More ...", "Delete"],
    ValueTable: ["Resize", "Select Data Field", "More ...","Delete"],
    ValueLabel: ["Select Data Field", "More ...", "Delete"],
    Box: ["Resize","More ...", "Delete"],
    Circle: ["Resize","More ...", "Delete"],
    page: ["Backgroundcolor"],
    Value: ["Select Data Field", "Delete"],
    Label: ['Resize',"Change Text", "More ...", "Delete"],
    Text: ["Select Data Field", "More ...", "Delete"],
    Line: ["Resize",'Rotate 90deg',"More ...","Delete"]
  };


  const handleOptionClick = (option) => {
    if (option !== "Edit Font") {
      setMenuVisible(false); // Close menu only for other options
    }

    switch (option) {
      case "Resize":
        enableResize(itemId, droppedItems, setDroppedItems);
        break;
      case "Delete":
        deleteElement(itemId, droppedItems, setDroppedItems);
        break;
      case "Add Row":
        addRow(itemId, droppedItems, setDroppedItems);
        break;
      case "Add Column":
        addColumn(itemId, droppedItems, setDroppedItems);
        break;
      case "Delete Row":
        deleteRow(itemId, droppedItems, setDroppedItems);
        break;
      case "Delete Column":
        deleteColumn(itemId, droppedItems, setDroppedItems);
        break;
      case "Change Text":
        handleLabelClick(itemId);
        break;
      
      case "More ...":
        setFontEdit(true); // Keep font editor visible
        break;
      case "Rotate 90deg":
        console.log('okok',droppedItems)
        rotate90deg(itemId, droppedItems, setDroppedItems);
        break;
      case "Select Data Field":
        if (onFieldSelect) {
          const item = droppedItems.find(i => i.id === itemId);
          if (item) {
            onFieldSelect(item);
          }
        }
        break;
      default:
        console.log("Option not recognized");
    }
  };

  return (
    <>
      {menuVisible && menuType && menuPosition && (
        <ul className='rightOption'
          ref={menuRef}
          style={{
            position: "absolute",
            top: `${menuPosition.y}px`,
            left: `${menuPosition.x}px`,
            backgroundColor: "white",
            boxShadow: "0px 0px 10px rgba(0,0,0,0.2)",
            width:'150px',
            padding:'2px',
            listStyle: "none",
            borderRadius: "5px",
          }}
        >
          {menuOptions[menuType]?.map((option, index) => (
            <li
              key={`${menuType}-${option}-${index}`}
              style={{ padding: "5px", cursor: "pointer" }}
              onClick={() => handleOptionClick(option || "page")}
            >
              {option || "page"}
            </li>
          ))}
        </ul>
      )}

      {fontEdit && (
        <FontEditor
          itemId={itemId}
          setFontEdit={setFontEdit}
          droppedItems={droppedItems}
          setDroppedItems={setDroppedItems}
        />
      )}
    </>
  );
};


export default MenuBar;
