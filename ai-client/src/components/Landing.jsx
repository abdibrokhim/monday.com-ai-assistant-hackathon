import React, { useEffect, useState } from "react";
import CodeEditorWindow from "./CodeEditorWindow";
import axios from "axios";
// import { classnames } from "../utils/general";
import { languageOptions } from "../constants/languageOptions";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { defineTheme } from "../lib/defineTheme";
import useKeyPress from "../hooks/useKeyPress";
// import Footer from "./Footer";
import OutputWindow from "./OutputWindow";
// import CustomInput from "./CustomInput";
import OutputDetails from "./OutputDetails";
import ThemeDropdown from "./ThemeDropdown";
import LanguagesDropdown from "./LanguagesDropdown";
// import Icons from "../icons";
import RunButton from "./RunButton";

const pythonDefault = `print("Hello World")`;

const Landing = () => {
  const [code, setCode] = useState(pythonDefault);
  const [customInput, setCustomInput] = useState("");
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [theme, setTheme] = useState("active4d");
  const [language, setLanguage] = useState(languageOptions[2]);
  const [showExecutionLog, setShowExecutionLog] = useState(false);
  const [executionLogHeight, setExecutionLogHeight] = useState(200);
  const [resizing, setResizing] = useState(false);


  const enterPress = useKeyPress("Enter");
  const ctrlPress = useKeyPress("Control");

  const onSelectChange = (sl) => {
    console.log("selected Option...", sl);
    setLanguage(sl);
  };

  useEffect(() => {
    if (enterPress && ctrlPress) {
      console.log("enterPress", enterPress);
      console.log("ctrlPress", ctrlPress);
      handleCompile();
    }
  }, [ctrlPress, enterPress]);
  const onChange = (action, data) => {
    switch (action) {
      case "code": {
        setCode(data);
        break;
      }
      default: {
        console.warn("case not handled!", action, data);
      }
    }
  };

  const handleAgent = () => {
    alert("The agent is not available at the moment");
  };
  
  const handleCompile = () => {
    // Check if the API call limit has been reached
    const apiCallLimit = 2;
    const apiCallLimitDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTimestamp = new Date().getTime();
    
    if (localStorage.getItem("apiCallCount")) {
      const apiCallCount = parseInt(localStorage.getItem("apiCallCount"));
      const firstApiCallTime = parseInt(localStorage.getItem("firstApiCallTime"));
      
      if (apiCallCount >= apiCallLimit && currentTimestamp - firstApiCallTime < apiCallLimitDuration) {
        // API call limit reached, show an error message
        showErrorToast("API call limit reached. Please wait for 5 minutes before making more API calls.");
        return;
      }
    } else {
      // Set the initial values in local storage
      localStorage.setItem("apiCallCount", "0");
      localStorage.setItem("firstApiCallTime", currentTimestamp.toString());
    }
  
    // Increment the API call count in local storage
    const apiCallCount = parseInt(localStorage.getItem("apiCallCount"));
    localStorage.setItem("apiCallCount", (apiCallCount + 1).toString());
  
    // Proceed with the API call
    setProcessing(true);
    const formData = {
      language_id: language.id,
      // encode source code in base64
      source_code: btoa(code),
      stdin: btoa(customInput),
    };
    const options = {
      method: "POST",
      url: process.env.REACT_APP_RAPID_API_URL,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
      data: formData,
    };
  
    axios
      .request(options)
      .then(function (response) {
        console.log("res.data", response.data);
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        // get error status
        let status = err.response.status;
        console.log("status", status);
        if (status === 429) {
          console.log("too many requests", status);
  
          showErrorToast(
            `Quota of 50 requests exceeded for the Day!`,
            10000
          );
        }
        setProcessing(false);
        console.log("catch block...", error);
      });
    };
  

  const checkStatus = async (token) => {
    const options = {
      method: "GET",
      url: process.env.REACT_APP_RAPID_API_URL + "/" + token,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        console.log("response.data", response.data);
        return;
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
      showErrorToast();
    }
  };

  function handleThemeChange(th) {
    const theme = th;
    console.log("theme...", theme);

    if (["light", "vs-dark"].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then((_) => setTheme(theme));
    }
  }
  useEffect(() => {
    defineTheme("active4d").then((_) =>
      setTheme({ value: "active4d", label: "Active4D" })
    );
  }, []);

  const showSuccessToast = (msg) => {
    toast.success(msg || `Compiled Successfully!`, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showErrorToast = (msg, timer) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: "top-right",
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  useEffect(() => {
    if (resizing) {
      const handleMouseMove = (event) => {
        const newHeight = window.innerHeight - event.clientY;
        const clampedHeight = Math.max(100, Math.min(newHeight, 500));
        setExecutionLogHeight(clampedHeight);
      };
      
  
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
  
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing]);

  const toggleExecutionLog = () => {
    setShowExecutionLog(!showExecutionLog);
  };

  const handleMouseDown = (event) => {
    setResizing(true);
  };
  
  const handleMouseUp = () => {
    setResizing(false);
  };
  
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="flex flex-col sm:flex-row">
        <div className="px-4 py-2">
          <LanguagesDropdown onSelectChange={onSelectChange} />
        </div>
        <div className="px-4 py-2">
          <ThemeDropdown handleThemeChange={handleThemeChange} theme={theme} />
        </div>
        <div className="px-4 py-2">
          <RunButton handleCompile={language.id !== 43 ? handleCompile : handleAgent} code={code} processing={processing}/>
        </div>
        <div className="px-4 py-2">
          <button className="border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_rgba(0,0,0)] px-4 py-2 hover:shadow transition duration-200 bg-white flex-shrink-0" onClick={toggleExecutionLog}>
            Execution Log
          </button>
        </div>
      </div>
      <div className="flex flex-col h-full">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 items-start px-4 py-4">
          <div className="flex flex-col w-full h-full justify-start items-end">
            <CodeEditorWindow
              code={code}
              onChange={onChange}
              language={language?.value}
              theme={theme.value}
            />
          </div>
        </div>
      </div>
    <div className="relative">
      {showExecutionLog && (
        <>
          <div
            className={`fixed left-0 right-0 bottom-0 bg-white border-t border-gray-300 overflow-y-auto z-50 ${
              resizing ? "pointer-events-none" : ""
            }`}
            style={{ height: `${executionLogHeight + 1}px`, cursor: "row-resize", }}
            onMouseDown={handleMouseDown}
          ></div>
          <div
            className="fixed left-0 right-0 bottom-0 bg-white border-gray-300 overflow-y-auto z-50"
            style={{ height: `${executionLogHeight}px`, maxHeight: "500px", minHeight: "100px", }}
          >
            <div className="">
              <OutputWindow outputDetails={outputDetails} />
              {outputDetails && <OutputDetails outputDetails={outputDetails} />}
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};
export default Landing;
