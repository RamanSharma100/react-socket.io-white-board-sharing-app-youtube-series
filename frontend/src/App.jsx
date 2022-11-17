import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import io from "socket.io-client";

import "./App.css";

import Forms from "./components/Forms";
import RoomPage from "./pages/RoomPage";

const server = "http://localhost:5000";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

const App = () => {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [peers, setPeers] = useState({});
  const [myPeer, setMyPeer] = useState(null);
  const [openVideo, setOpenVideo] = useState(true);

  const videoGrid = useRef(null);

  const addVideoStream = (div, video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
    div.append(video);
    videoGrid.current.append(div);
  };

  const connectToNewUser = (userId, name, stream) => {
    console.log(myPeer, stream);
    const call = myPeer.call(userId, stream);
    console.log("call", call);
    const div = document.createElement("div");
    div.id = userId;
    const video = document.createElement("video");
    const p = document.createElement("p");
    console.log(users);
    p.innerText = name;
    div.append(p);
    call.on("stream", (userVideoStream) => {
      addVideoStream(div, video, userVideoStream);
    });
    call.on("close", () => {
      video.remove();
    });

    setPeers((prevPeers) => {
      return { ...prevPeers, [userId]: call };
    });
  };

  useEffect(() => {
    socket.on("userIsJoined", (data) => {
      if (data.success) {
        console.log("userJoined");
        setUsers(data.users);
      } else {
        console.log("userJoined error");
      }
    });

    socket.on("allUsers", (data) => {
      setUsers(data);
    });

    socket.on("userLeftMessageBroadcasted", (data) => {
      console.log(`${data.name} ${data.userId} left the room`);
      toast.info(`${data.name} left the room`);
      if (peers[data.userId]) peers[data.userId].close();
    });
  }, []);

  const uuid = () => {
    let S4 = () => {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (
      S4() +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      S4() +
      S4()
    );
  };

  return (
    <div className="container">
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            <Forms
              uuid={uuid}
              setMyPeer={setMyPeer}
              socket={socket}
              setUser={setUser}
            />
          }
        />
        <Route
          path="/:roomId"
          element={
            <>
              <button
                onClick={() => setOpenVideo(!openVideo)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  zIndex: "100",
                  backgroundColor: "white",
                  border: "none",
                  padding: "10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Open Video
              </button>
              <div
                className="video-grid h-100 position-fixed top-0 "
                style={{
                  zIndex: 1000,
                  right: openVideo ? "0" : "-100%",
                }}
                ref={videoGrid}
              >
                <button
                  className="btn btn-light  "
                  onClick={() => setOpenVideo(false)}
                >
                  Close
                </button>
              </div>
              <RoomPage
                connectToNewUser={connectToNewUser}
                addVideoStream={addVideoStream}
                videoGrid={videoGrid}
                user={user}
                myPeer={myPeer}
                setPeers={setPeers}
                socket={socket}
                users={users}
                setUsers={setUsers}
              />
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
