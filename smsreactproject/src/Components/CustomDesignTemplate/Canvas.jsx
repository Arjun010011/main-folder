import React, { useRef, useState , useEffect } from "react";
import { Link } from "react-router-dom";
import html2canvas from "html2canvas";
import MenuBar from "./MenuBar";
import Data  from "./Data";
import { jsPDF } from "jspdf";
import './Canvas.css'   

const Canvas = ({ pageWidth, pageHeight, droppedItems, setDroppedItems, divRef, pageBg, data: propData, onFieldSelect }) => {
  const [draggingItem, setDraggingItem] = useState(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [menuVisible, setMenuVisible] = useState(false);
  const [labelInput,setLabelInput]=useState('')
  const [menuType, setMenuType] = useState(null);
  const [itemId,setItemId]=useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedValue, setDroppedValue] = useState("");
  const [isDropped, setIsDropped] = useState(false);
  const [isEditing,setIsEditing]=useState(true)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [viewToggle,setViewToggle]=useState(false)
  const tempdata=localStorage.getItem('data')
  const data = propData || (tempdata ? JSON.parse(tempdata) : null)
  const menuRef = useRef(null);
  const handleToggle = () => {
    setViewToggle(!viewToggle)
  }


  const handleContextMenu = (event, type,id) => {
    event.preventDefault();
    setItemId(id);
    setMenuType(type);
    setMenuPosition({ x: event.pageX, y: event.pageY });
    setMenuVisible(true);
  };
  // Handle outside click to close menu
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMenuVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);


  const handleDragStart = (e, itemType,id,width,height) => {
    e.dataTransfer.setData("itemType", itemType);
    e.dataTransfer.setData("id",id);
    e.dataTransfer.setData("width",width);
    e.dataTransfer.setData("height",height);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const itemType = e.dataTransfer.getData("itemType");
    const itemLocalId = e.dataTransfer.getData("id");
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const height =(e.dataTransfer.getData("height"))+'px';
    const width =(e.dataTransfer.getData("width"))+'px';
    if(itemType == 'Label'){
      setIsEditing(true)
    }

    setDroppedItems((prevItems = []) => {
      const updatedItems = [
        ...prevItems,
        { type: itemType, x: offsetX, y: offsetY, id: itemLocalId, width, height, row: 3, column: 3, isEditing: true }
      ];
      localStorage.setItem("droppedItems", JSON.stringify(updatedItems));
      console.log(itemType,'')
      return updatedItems;
    });
    
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleMouseDown = (e, id, type) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingItem(id);
    const rect = e.currentTarget.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseMove = (e) => {
    if (draggingItem !== null) {
      e.preventDefault();
      const rect = divRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - offsetRef.current.x;
      const newY = e.clientY - rect.top - offsetRef.current.y;

      setDroppedItems((prevItems) => {
        const updated = prevItems.map((item) =>
          item.id === draggingItem ? { ...item, x: newX, y: newY } : item
        );
        localStorage.setItem("droppedItems", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  const handleGeneratePDF = () => {
    const input = divRef.current;

    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save("download.pdf");
      })
      .catch((error) => {
        console.error("PDF generation error:", error);
      });
  };

  const handleLabelClick = (id) => {
    setDroppedItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, isEditing: true } : item
      )
    );
  };
  

  const handleLabelSubmit = (id) => {
    let updatedItems = [...droppedItems]; // Create a new array copy

    updatedItems.forEach((item) => {
      if (item.id === id) {
        item.value = labelInput;
        item.isEditing=false;
      }
    });

    localStorage.setItem("droppedItems", JSON.stringify(updatedItems));

    setDroppedItems(updatedItems); // Updating state
    setLabelInput('');
};
  // Allow Drop
  const allowDrop = (event) => {
    event.preventDefault();
  };

  // Handle Drop
  const handleValueDrop = (event, item) => {
    event.preventDefault();
    console.log("Dropped on:", item);
    const value = event.dataTransfer.getData("text/plain");
    console.log("Dropped Value:", value);

    try {
        const parsedValue = JSON.parse(value); // Convert string back to object if valid
        console.log("Parsed JSON:", parsedValue);

        const numRows = Object.keys(parsedValue).length;
        const firstKey = Object.keys(parsedValue)[0];
        const firstValue = parsedValue[firstKey];

        const numCols = typeof firstValue === "object" && firstValue !== null ? 3 : 2;
        console.log(`Rows: ${numRows}, Columns: ${numCols}`);

        let pathvalue = findKeyPath(data, parsedValue);
        console.log("Path:", pathvalue);

        const updatedItems = droppedItems.map((ele) =>
            ele.id === item.id
                ? {
                      ...ele,
                      type: "ValueTable",
                      value: pathvalue,
                      row: numRows,
                      column: numCols
                  }
                : ele
        );
        setDroppedItems(updatedItems);
    } catch {
        try {
            new URL(value); // Validate if it's a URL
            console.log("The value is a valid URL:", value);
        } catch {
            if (isRelativeAddress(value)) {
                console.log("Detected as an address");
                let pathvalue = findKeyPath(data, value);
                const updatedItems = droppedItems.map((ele) =>
                    ele.id === item.id
                        ? {
                              ...ele,
                              type: "ValueImage",
                              value: pathvalue,
                              width: "100px",
                              height: "100px"
                          }
                        : ele
                );
                setDroppedItems(updatedItems);
            } else {
                console.log("Detected as a label");
                let pathvalue = findKeyPath(data, value);
                console.log("Path:", pathvalue);
                const updatedItems = droppedItems.map((ele) =>
                    ele.id === item.id ? { ...ele, type: "ValueLabel", value: pathvalue } : ele
                );
                setDroppedItems(updatedItems);
            }
            setDroppedValue(value);
        }
    }

    localStorage.setItem("droppedItems", JSON.stringify(droppedItems));
    setIsDragging(false);
};

function isRelativeAddress(path) {
    const relativePathRegex = /^(\.?\/)?([\w-]+\/)+[\w-]+\.\w{2,5}$/;
    return relativePathRegex.test(path);
}

function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function findKeyPath(obj, target, path = "") {
    if (!obj) return null;
    if (isEqual(obj, target)) return path;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            let newPath = path ? `${path}.${i}` : `${i}`;
            let result = findKeyPath(obj[i], target, newPath);
            if (result) return result;
        }
    } else if (typeof obj === "object" && obj !== null) {
        for (let key in obj) {
            let newPath = path ? `${path}.${key}` : key;
            let result = findKeyPath(obj[key], target, newPath);
            if (result) return result;
        }
    }
    return null;
}


  const renderVariableItem = (item) =>{
    const itemvalue=item.value;
    switch (item.type) {
      case "Image":
        return (
          <div id={item.id} className="basicImgDiv" style={{ position: 'relative', width: item.width, height: item.width }}>
            {!item.imageSrc ? (
              // Show input if no image is uploaded
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const updatedItems = droppedItems.map(droppedItem => 
                        droppedItem.id === item.id 
                          ? { ...droppedItem, imageSrc: reader.result }
                          : droppedItem
                      );
                      setDroppedItems(updatedItems); // Trigger re-render
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            ) : (
              // Show the uploaded image
              <img
                src={item.imageSrc}
                alt="Uploaded"
                style={{ width: '100%', height: '100%', display: 'block' }}
                onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
              />
            )}
          </div>
        );

        case "Table": 
          return <table id={item.id} className="basicTable" onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} style={{width:item.width,height:item.height,backgroundColor:`${item.backgroundcolor||'none'}`,border:`${item.bordersize||'2px'} solid ${item.bordercolor||'black'}`}}>
            <thead>
            </thead>
            <tbody>
                {[...Array(item.row)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                        {[...Array(item.column)].map((_, colIndex) => (
                            <td key={colIndex}></td>
                        ))}
                    </tr>
                ))}
            </tbody>
          </table>
        case 'Label':
              return item.isEditing ? (
                <div>
                  <input
                    type="text"
                    style={{ color: 'black', width: item.width, height: item.height}}
                    onChange={(e) => setLabelInput(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => handleLabelSubmit(item.id)}>Submit</button>
                </div>
              ) : (
                <label
                  id={item.id}
                  
                  style={{ width: item.width, height: item.height, display: 'inline-block',fontSize:item.fontsize,fontWeight:item.fontweight,fontStyle:item.fontstyle,color:item.fontcolor,fontFamily:item.fontfamily }}
                  onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                >
                  {item.value || 'Click to Edit'}
                </label>
              );
              case 'Box':
                return <div id={item.id} style={{width:item.width.replace('pxpx','px'),height:item.height.replace('pxpx','px'),border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}></div>
              case 'Circle':
                return <div id={item.id} style={{width:item.width,height:item.height,border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor,borderRadius:'50%'}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}></div>
              case 'Line':
                return <hr id={item.id} style={{width:item.width,height:item.height,backgroundColor:`${item.bordercolor||'black'}`,transform: `rotate(${item.rotation}deg)`,}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}/>
        case 'Value' :
                return (
                  <div id={item.id} onDrop={(event) => handleValueDrop(event, item)} onDragOver={allowDrop} className="dropValue" onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}>
                    <p>Drop Here:</p>
                    
                  </div>
                );
                case "ValueTable":
                  const jsonData=data
                  const itemValue=itemvalue
                  console.log(itemvalue)
                                  // Extract the object from the JSON based on the key
                                  // Function to get a nested value using dot notation (e.g., "grading_scales.scholastic")
                  const getNestedValue = (obj, path) => {
                    return path.split('.').reduce((acc, key) => (acc && acc[key] ? acc[key] : null), obj);
                };

                // Extract data using dot notation
                const extractedData = getNestedValue(jsonData, itemValue);

                const renderTable = (data) => {
                    if (!data) return <p>No data available</p>;

                    if (Array.isArray(data)) {
                        // Handle array case (assumes objects inside array)
                        if (data.length === 0) return <p>No data available</p>;

                        const headers = Array.from(new Set(data.flatMap((item) => Object.keys(item))));

                         if (!item.traverse)return (
                          
                            <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}border="1" cellPadding="8" >
                                <thead style={{backgroundColor:item.thbackgroundcolor,height:item.minheight,fontSize:item.thfontsize}}>
                                    <tr >
                                        {headers.map((header) => (
                                            <th key={header} style={{minWidth:'50px',minHeight:'50px'}}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                    {data.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {headers.map((header) => (
                                                <td key={header} style={{minWidth:'50px',minHeight:'50px'}}>{typeof row[header] === "object" ? renderTable(row[header]) : `${itemValue}.${rowIndex}.${header}` ?? "—"}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );
                        else return (
                          
                          <table
                            id={item.id}
                            style={{
                              height: item.height,
                              width: item.width,
                              borderCollapse: "collapse",
                              fontFamily: item.fontfamily,
                            }}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                            border="1"
                            cellPadding="8"
                          >
                            <thead>
                              
                            </thead>
                            <tbody style={{ backgroundColor: item.tbbackgroundcolor, height: item.minheight, fontSize: item.tbfontsize }}>
                              {headers.map((header, colIndex) => (
                                <tr key={colIndex}>
                                  <td style={{ minWidth: "50px", minHeight: "50px", fontWeight: "bold" }}>{header}</td>
                                  {data.map((row, rowIndex) => (
                                    <td key={`${colIndex}-${rowIndex}`} style={{ minWidth: "50px", minHeight: "50px" }}>
                                      {typeof row[header] === "object" ? renderTable(row[header]) : `${itemValue}.${rowIndex}.${header}` ?? "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>

                      );
                    } else if (typeof data === "object" && data !== null) {
                        // Handle object case (key-value table)
                        if(item.traverse)return (
                            <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} border="1" cellPadding="8" >
                                <thead>
                                </thead>
                                <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                    {Object.entries(data).map(([key, value],i) => (
                                        <tr key={key}>
                                            <td style={{minWidth:'50px',minHeight:'50px'}}>{`${itemValue}.${i}`}</td>
                                            <td style={{minWidth:'50px',minHeight:'50px'}}>{typeof value === "object" ? renderTable(value) : `${itemValue}.${key}`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );
                        else return (
                          <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                          onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} border="1" cellPadding="8" >
                              <thead>
                                <tr>
                                </tr>
                              </thead>
                              <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                <tr>
                                  {Object.entries(data).map(([key, value],i) => (
                                          <td style={{minWidth:'50px',minHeight:'50px'}}>{`${itemValue}.${i}`}</td>     
                                  ))}
                                  </tr>
                                  <tr>
                                  {Object.entries(data).map(([key, value]) => (
                                          <td style={{minWidth:'50px',minHeight:'50px'}}>{typeof value === "object" ? renderTable(value) : `${itemValue}.${key}`}</td>
                                  ))}
                                  </tr>
                              </tbody>
                          </table>
                      );
                    }
                    return <p>No valid data found</p>;
                };

                return <div>{renderTable(extractedData)}</div>;
          case "ValueLabel":
                console.log('type ',item.type,'data',item.value)
                  return (
                      <label
                          id={item.id}
                          onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                          style={{
                              fontSize: item.fontsize,
                              fontWeight: item.fontweight,
                              fontStyle: item.fontstyle,
                              color: item.fontcolor,
                              width: item.width,
                              fontFamily:item.fontfamily
                          }}
                      >
                          {itemvalue || "--"}
                      </label>
                  );
      
              case "ValueImage":
                  return (
                    <label>{itemvalue}</label>
                  );
                    }
                  }

    const renderValueItem = (item) =>{
      const itemvalue=item.value;
      switch (item.type) {
        case "Image":
          return (
            <div id={item.id} className="basicImgDiv" style={{ position: 'relative', width: item.width, height: item.width }}>
              {!item.imageSrc ? (
                // Show input if no image is uploaded
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const updatedItems = droppedItems.map(droppedItem => 
                          droppedItem.id === item.id 
                            ? { ...droppedItem, imageSrc: reader.result }
                            : droppedItem
                        );
                        setDroppedItems(updatedItems); // Trigger re-render
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              ) : (
                // Show the uploaded image
                <img
                  src={item.imageSrc}
                  alt="Uploaded"
                  style={{ width: '100%', height: '100%',display:'block',borderRadius:item.borderradius,backgroundColor:`${item.backgroundcolor||'none'}`,border:`${item.bordersize||'2px'} solid ${item.bordercolor||'none '}`}}
                  onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                />
              )}
            </div>
          );
        
  
          case "Table": 
            return <table id={item.id} className="basicTable" onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} style={{width:item.width,height:item.height,backgroundColor:`${item.backgroundcolor||'none'}`,border:`${item.bordersize||'2px'} solid ${item.bordercolor||'black'}`}}>
              <thead>
              </thead>
              <tbody>
                  {[...Array(item.row)].map((_, rowIndex) => (
                      <tr key={rowIndex}>
                          {[...Array(item.column)].map((_, colIndex) => (
                              <td key={colIndex}></td>
                          ))}
                      </tr>
                  ))}
              </tbody>
            </table>
          case 'Label':
                return item.isEditing ? (
                  <div>
                    <input
                      type="text"
                      style={{  width: item.width, height: item.height}}
                      onChange={(e) => setLabelInput(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleLabelSubmit(item.id)}>Submit</button>
                  </div>
                ) : (
                  <label
                    id={item.id}
                    style={{  width: item.width, height: item.height, display: 'inline-block',fontSize:item.fontsize,fontWeight:item.fontweight,fontStyle:item.fontstyle,color:item.fontcolor,fontFamily:item.fontfamily}}
                    onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                  >
                    {item.value || 'Click to Edit'}
                  </label>
                );
          case 'Box':
            return <div id={item.id} style={{width:item.width.replace('pxpx','px'),height:item.height.replace('pxpx','px'),border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}></div>
          case 'Circle':
            return <div id={item.id} style={{width:item.width,height:item.height,border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor,borderRadius:'50%'}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}></div>
          case 'Line':
            return <hr id={item.id} style={{width:item.width,height:item.height,backgroundColor:`${item.bordercolor||'black'}`,transform: `rotate(${item.rotation}deg)`}} onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}/>
          case 'Value' :
                  return (
                    <div id={item.id} onDrop={(event) => handleValueDrop(event, item)} onDragOver={allowDrop} className="dropValue" onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}>
                      <p>Drop Here:</p>
                      
                    </div>
                  );
                  case "ValueTable":
                    const jsonData=data
                    const itemValue=itemvalue
                    console.log(itemvalue)
                                    // Extract the object from the JSON based on the key
                                    // Function to get a nested value using dot notation (e.g., "grading_scales.scholastic")
                    const getNestedValue = (obj, path) => {
                      return path.split('.').reduce((acc, key) => (acc && acc[key] ? acc[key] : null), obj);
                  };

                  // Extract data using dot notation
                  const extractedData = getNestedValue(jsonData, itemValue);

                  const renderTable = (data) => {
                      if (!data) return <p>No data available</p>;

                      if (Array.isArray(data)) {
                          // Handle array case (assumes objects inside array)
                          if (data.length === 0) return <p>No data available</p>;

                          const headers = Array.from(new Set(data.flatMap((item) => Object.keys(item))));

                           if (!item.traverse)return (
                            
                              <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                              onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}border="1" cellPadding="8" >
                                  <thead style={{backgroundColor:item.thbackgroundcolor,height:item.minheight,fontSize:item.thfontsize}}>
                                      <tr >
                                          {headers.map((header) => (
                                              <th key={header} style={{minWidth:'50px',minHeight:'50px'}}>{header}</th>
                                          ))}
                                      </tr>
                                  </thead>
                                  <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                      {data.map((row, rowIndex) => (
                                          <tr key={rowIndex}>
                                              {headers.map((header) => (
                                                  <td key={header} style={{minWidth:'50px',minHeight:'50px'}}>{typeof row[header] === "object" ? renderTable(row[header]) : row[header] ?? "—"}</td>
                                              ))}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          );
                          else return (
                            
                            <table
                              id={item.id}
                              style={{
                                height: item.height,
                                width: item.width,
                                borderCollapse: "collapse",
                                fontFamily: item.fontfamily,
                              }}
                              onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                              border="1"
                              cellPadding="8"
                            >
                              <thead style={{ backgroundColor: item.thbackgroundcolor, height: item.minheight, fontSize: item.thfontsize }}>
                                
                              </thead>
                              <tbody style={{ backgroundColor: item.tbbackgroundcolor, height: item.minheight, fontSize: item.tbfontsize }}>
                                {headers.map((header, colIndex) => (
                                  <tr key={colIndex}>
                                    <td style={{ minWidth: "50px", minHeight: "50px", fontWeight: "bold" }}>{header}</td>
                                    {data.map((row, rowIndex) => (
                                      <td key={`${colIndex}-${rowIndex}`} style={{ minWidth: "50px", minHeight: "50px" }}>
                                        {typeof row[header] === "object" ? renderTable(row[header]) : row[header] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                        );
                      } else if (typeof data === "object" && data !== null) {
                          // Handle object case (key-value table)
                          if(item.traverse)return (
                              <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                              onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} border="1" cellPadding="8" >
                                  <thead>
                                    <tr>
                                    </tr>
                                  </thead>
                                  <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                      {Object.entries(data).map(([key, value]) => (
                                          <tr key={key}>
                                              <td style={{minWidth:'50px',minHeight:'50px'}}>{key}</td>
                                              <td style={{minWidth:'50px',minHeight:'50px'}}>{typeof value === "object" ? renderTable(value) : value}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          );
                          else return (
                            <table id={item.id} style={{ height: item.height, width: item.width, borderCollapse: "collapse",fontFamily:item.fontfamily }}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)} border="1" cellPadding="8" >
                                <thead>
                                  <tr>
                                  </tr>
                                </thead>
                                <tbody style={{backgroundColor:item.tbbackgroundcolor,height:item.minheight,fontSize:item.tbfontsize}}>
                                  <tr>
                                    {Object.entries(data).map(([key, value]) => (
                                            <td style={{minWidth:'50px',minHeight:'50px'}}>{key}</td>     
                                    ))}
                                    </tr>
                                    <tr>
                                    {Object.entries(data).map(([key, value]) => (
                                            <td style={{minWidth:'50px',minHeight:'50px'}}>{typeof value === "object" ? renderTable(value) : value}</td>
                                    ))}
                                    </tr>
                                </tbody>
                            </table>
                        );
                      }
                      return <p>No valid data found</p>;
                  };

                  return <div>{renderTable(extractedData)}</div>;
        
                case "ValueLabel":
                  const string = itemvalue;
                  const text = itemvalue;
                  const resultArray = text.match(/[a-zA-Z0-9_]+/g); // Extract words and numbers
                  console.log(resultArray);

                  // Extract value inside square brackets
                  const match = string.match(/\[(.*?)\]/);
                  
                  if (match) {
                      console.log("Value inside brackets:", match[1]);
                  } else {
                      console.log("No brackets found");
                  }
                  
                  const getValue = (data, itemValue) => {
                    if (!itemValue || !data) return null;
                    
                    try {
                      const keys = itemValue.split('.');
                      let value = data;
                    
                      for (let key of keys) {
                        if (value === null || value === undefined) {
                          return null;
                        }
                        
                        // Handle array indices (numeric keys)
                        if (/^\d+$/.test(key)) {
                          const index = parseInt(key, 10);
                          if (Array.isArray(value) && index >= 0 && index < value.length) {
                            value = value[index];
                          } else {
                            return null;
                          }
                        } else if (typeof value === 'object' && key in value) {
                          value = value[key];
                        } else {
                          return null;
                        }
                      }
                      
                      // Ensure we return a string, not an object
                      if (value === null || value === undefined) {
                        return null;
                      }
                      
                      // If it's an object or array, convert to string representation
                      if (typeof value === 'object') {
                        return JSON.stringify(value);
                      }
                      
                      // Convert to string for rendering
                      return String(value);
                    } catch (error) {
                      console.error('Error getting value:', error, itemValue);
                      return null;
                    }
                  };
                  
                  // Usage
                  const result = getValue(data, itemvalue);
                  
                    return (
                      <div style={{height:item.height,width:item.width}}>
                        <label
                            id={item.id}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                            style={{
                                fontSize: item.fontsize,
                                fontWeight: item.fontweight,
                                fontStyle: item.fontstyle,
                                color: item.fontcolor,
                                fontFamily:item.fontfamily
                            }}
                        >
                            {result || (item.label || '')}

                        </label>
                        </div>
                    );
        
                case "ValueImage":
                    return (
                        <img
                            id={item.id}
                            src={data[itemvalue]}
                            onContextMenu={(e) => handleContextMenu(e, item.type, item.id)}
                            style={{ width: item.width, height: item.height }}
                            alt={itemvalue}
                        />
                    );
                  default:
            return null;
        }
      }

      const handleDownloadJSON = () => {
        const jsonString = localStorage.getItem("droppedItems");
        
        if (!jsonString) {
            alert("No data found in localStorage!");
            return;
        }
    
        try {
            const jsonBlob = new Blob([jsonString], { type: "application/json" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(jsonBlob);
            link.download = "data.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error down JSON:", error);
        }
    };

    const handleDownloadHTML = () => {
      const pageElement = document.getElementById("page");
  
      if (!pageElement) {
          alert("No page element found!");
          return;
      }
  
      // Get the inner HTML of the page div
      const pageContent = pageElement.outerHTML;
      
      // Wrap it in a full HTML template
      const fullHTML = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Downloaded Page</title>
      <style>
          body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background-color: ${localStorage.pageColor || "white"};
          }
          .page {
              margin-top: 40px;
              width: ${pageWidth}mm;
              height: ${pageHeight}mm;
              display: inline-block;
              position: relative;
              border: 1px solid #ddd;
              box-shadow: 0 5px 25px black;
              overflow: hidden;
          }
      </style>
  </head>
  <body>
      ${pageContent}
  </body>
  </html>`;
  
      // Convert to Blob and trigger download
      const blob = new Blob([fullHTML], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "page.html";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
    
  return (
    <div
      style={{ textAlign: "center", marginTop: "20px", marginBottom: "400px" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="tools">
      <div draggable="true" onDragStart={(e) => handleDragStart(e, "Value",Date.now(),100,20)}>
          Value
        </div>
        <div draggable="true" onDragStart={(e) => handleDragStart(e, "Image",Date.now(),50,50)}>
          Image
        </div>
        <div draggable="true"  onDragStart={(e) => handleDragStart(e, "Label",Date.now(),100,20)}>
          Label
        </div>
        <div draggable="true" onDragStart={(e) => handleDragStart(e, "Table",Date.now(),200,20)}>
          Table
        </div>
        <div draggable="true" onDragStart={(e) => handleDragStart(e, "Box",Date.now(),200,20)}>
          Box
        </div>
        <div draggable="true" onDragStart={(e) => handleDragStart(e, "Circle",Date.now(),200,20)}>
          Circle
        </div>
        <div draggable="true" onDragStart={(e) => handleDragStart(e, "Line",Date.now(),200,5)}>
          Line
        </div>
        
      </div>
      <div className="toolsHandle">
        <button onClick={handleGeneratePDF}>Download PDF</button>
        <button onClick={handleDownloadHTML}>Download HTML</button>
        <button onClick={handleDownloadJSON}>Download JSON</button>
        <button onClick={handleToggle}>{viewToggle?'Variable':'Value'}</button>
        <button>
        <Link to='/Render' state={{data:{'pageWidth':pageWidth,"pageHeight":pageHeight}}}>Save & Move</Link>
        </button>
        </div>
      <div
        className="page"
        id='page'
        ref={divRef}
        style={{
          marginTop: "40px",
          width: `${pageWidth}mm`,
          height: `${pageHeight}mm`,
          display: "inline-block",
          position: "relative",
          backgroundColor: localStorage.pageColor || pageBg || '#ffffff',
          border: "1px solid #ddd",
          boxShadow: "0 5px 25px black",
          overflow: "hidden"
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {droppedItems && droppedItems.length > 0 ? droppedItems.map((item) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: `${item.x}px`,
              top: `${item.y}px`,
              cursor: "grab",
            }}
            onMouseDown={(e) => handleMouseDown(e, item.id,item.type)}
          >
            {viewToggle ? renderVariableItem(item) : renderValueItem(item)}
          </div>
        )) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
            <p>No items on canvas yet. Drag elements from the toolbar or load a template.</p>
          </div>
        )}
      </div>
  
      <MenuBar
      setMenuVisible={setMenuVisible}
      menuVisible={menuVisible} 
      menuType={menuType}
      menuRef={menuRef}
      itemId={itemId}
      menuPosition={menuPosition}
      droppedItems={droppedItems}
      setDroppedItems={setDroppedItems}
      handleMouseMove={handleMouseMove}
      handleMouseUp={handleMouseUp}
      handleLabelClick={handleLabelClick}
      />
      <Data 
      handleValueDrop={handleValueDrop}
      allowDrop={allowDrop}
      droppedValue={droppedValue}
      setDroppedValue={setDroppedValue}
      isDragging={isDragging} 
      setIsDragging={setIsDragging}
      />
    </div>
  );
};
  

export default Canvas;
