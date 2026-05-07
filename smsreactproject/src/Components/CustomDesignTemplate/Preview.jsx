import { useState } from "react";
import React from "react";
import { useLocation } from "react-router-dom";

const Preview = () => {
  const location = useLocation();
  const recivedData = location.state?.data || {};
  const pageData = JSON.parse(localStorage.getItem("droppedItems")) || [];
  const pageBg = localStorage.getItem("pageColor");

  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  // Handle file selection
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target.result);
        setData(parsedData);
        setError(null);
      } catch (err) {
        setError("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  console.log('preview',data  )
  const renderItem = (item) =>{
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
                      item.imageSrc = reader.result; // Store image in item object
                      setItems([...items]); // Trigger re-render
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
                
              />
            )}
          </div>
        );
      

        case "Table": 
          return <table id={item.id} className="basicTable"  style={{width:item.width,height:item.height,backgroundColor:`${item.backgroundcolor||'none'}`,border:`${item.bordersize||'2px'} solid ${item.bordercolor||'black'}`}}>
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
                  style={{  width: item.width, height: item.height, display: 'inline-block',fontSize:item.fontsize,fontWeight:item.fontweight,fontStyle:item.fontstyle,color:item.fontcolor,fontFamily:item.fontfamily }}
                  
                >
                  {item.value || 'Click to Edit'}
                </label>
              );
        case 'Box':
          console.log(item)
          return <div id={item.id} style={{width:item.width.replace('pxpx','px'),height:item.height.replace('pxpx','px'),border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor}} ></div>
        case 'Circle':
          return <div id={item.id} style={{width:item.width,height:item.height,border: `${item.bordersize || '2px'} solid ${item.bordercolor || 'black'}`,backgroundColor:item.backgroundcolor,borderRadius:'50%'}} ></div>
        case 'Line':
          return <hr id={item.id} style={{width:item.width,height:item.height,backgroundColor:`${item.bordercolor||'black'}`,transform: `rotate(${item.rotation}deg)`}} />
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
                      border="1" cellPadding="8" >
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
                      border="1" cellPadding="8" >
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
                    border="1" cellPadding="8" >
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
                console.log('value',itemvalue)
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
                  if (!itemValue) return null;
                  
                  const keys = itemValue.split('.');
                  let value = data;
                
                  for (let key of keys) {
                    if (value && key in value) {
                      value = value[key];
                    } else {
                      return null;
                    }
                  }
                  
                  return value;
                };
                
                // Usage
                const result = getValue(data, itemvalue);
                  return (
                    <div style={{height:item.height,width:item.width}}>
                      <label
                          id={item.id}
                          
                          style={{
                              fontSize: item.fontsize,
                              fontWeight: item.fontweight,
                              fontStyle: item.fontstyle,
                              color: item.fontcolor,
                              fontFamily:item.fontfamily
                          }}
                      >
                          {getValue(data, itemvalue) }

                      </label>
                      </div>
                  );
      
              case "ValueImage":
                  return (
                      <img
                          id={item.id}
                          src={data[itemvalue]}
                          
                          style={{ width: item.width, height: item.height }}
                          alt={itemvalue}
                      />
                  );
            
                default:
          return null;
      }
    }

  return (
    <>
      <div>
      <h1>Preview</h1>
      </div>

      <div>

      <input type="file" accept=".json" onChange={handleFileUpload} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      </div>

      <div
      className="page"
      id="page"
      style={{
        position: "relative", // Ensure page is relative
        marginTop: "40px",
        width: `${recivedData.pageWidth || 0}mm`,
        height: `${recivedData.pageHeight || 0}mm`,
        display: "inline-block",
        backgroundColor: pageBg ?? "#fff",
        border: "1px solid #ddd",
        boxShadow: "0 5px 25px black",
        overflow: "hidden",
      }}
    >
        {Array.isArray(pageData) &&
          pageData.map((item) => (
            <div
              key={item.id}
              style={{
                position: "absolute",
                left: `${item.x}px`,
                top: `${item.y}px`,
                cursor: "grab",
              }}
            >
              {renderItem(item)}
            </div>
          ))}
      </div>
    </>
  );
};

export default Preview;
