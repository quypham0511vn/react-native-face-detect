import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { runOnJS } from "react-native-reanimated";
import Svg, { Circle, Ellipse } from "react-native-svg";
import {
  Camera,
  CameraCaptureError,
  useCameraDevices,
  useFrameProcessor,
} from "react-native-vision-camera";
import { Face, scanFaces } from "vision-camera-face-detector";
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);


const App = () => {
  const [show, setShow] = useState<boolean>(false);
  const [isBack, setIsBack] = useState<boolean>(false);
  const [faces, setFaces] = useState<Face[]>([]);
  const [image, setImg] = useState<any>();
  const [hasPermission, setHasPermission] = React.useState(false);


  const detect = useRef<any>();

  const camera = useRef<Camera>(null);

  const countInterval = useRef<any>();
  const [count, setCount] = useState<number>(5);

  const increase = useCallback(() => {
    setInterval(() => setCount((old) => old + 2), 500);
  }, []);

  useEffect(() => {
    increase();
    countInterval.current = count;
    return () => {
      clearInterval(countInterval?.current); //when user exits, clear this interval.
    };
  }, []);

  const loaderValue = useRef(new Animated.Value(0)).current;

  const load = (count: any) => {
    Animated.timing(loaderValue, {
      toValue: count, //final value
      duration: 500, //update value in 500 milliseconds
      easing: Easing.inOut(Easing.linear),
      useNativeDriver: true,
    }).start();
  };

  const rotate = loaderValue.interpolate({
    inputRange: [5, 10],
    outputRange: [0.1, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    load(count);
    if (count >= 10) {
      setCount(5);
      clearInterval(countInterval.current);
    }
  }, [count]);

  useEffect(() => {
    console.log("faces = ", JSON.stringify(faces));
  }, [faces]);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "authorized");
    })();
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const scannedFaces = scanFaces(frame);
    runOnJS(setFaces)(scannedFaces);
  }, []);

  const devices = useCameraDevices();

  const showBackCamera = useCallback(() => {
    setIsBack((last) => !last);
  }, []);

  const showCamera = () => {
    setShow((last) => !last);
  };
  let AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

  const renderSvg = useCallback(
    (auth: boolean, hasColorStroke?: boolean, opacity?: any) => {
      return (
          <Svg
            height="100%"
            width="100%"
            fill={"red"}
            style={[
              {
                position: "absolute",
                flex: 1,
                zIndex: 1000,
              },
            ]}
          >
            {auth ? (
              <AnimatedEllipse
                cx="165"
                cy="175"
                rx="100"
                ry="140"
                stroke={hasColorStroke ? "#024D18" : "red"}
                strokeWidth={hasColorStroke ?'4':"2"}
                strokeDasharray={hasColorStroke ? 5 : 6}
                fill="none"
                opacity={opacity}
              />
            ) : undefined}
          </Svg>
      );
    },
    []
  );

  const renderCam = useCallback(
    (
      _ref: any,
      _back?: any,
      _front?: any,
      _framePro?: any,
      enableElip?: boolean,
      hasColorStroke?: boolean,
      anime?: any
    ) => {
      return (
        <Animated.View
          style={[
            styles.cameraContainer,
            {
              borderWidth: 10,
              borderColor: hasColorStroke ? "green" : "red",
              position: "relative",
            },
          ]}
        >
          {renderSvg(enableElip || false, hasColorStroke || false, anime)}
          <Camera
            ref={camera}
            photo={true}
            style={[styles.wrapSelfCamera]}
            device={isBack ? _back : _front}
            isActive={true}
            fps={30}
            frameProcessor={_framePro}
            frameProcessorFps={1}
          ></Camera>
        </Animated.View>
      );
    },
    [isBack]
  );

  const authenFace = (objects: Face[]) => {
    if (
      objects?.length === 1 &&
      objects[0].yawAngle > -6 &&
      objects[0].yawAngle <= 6 &&
      objects[0].pitchAngle > -6 &&
      objects[0].pitchAngle <= 6 &&
      objects[0].rollAngle > -6 &&
      objects[0].rollAngle <= 6 &&
      objects[0].bounds.width >= 280 &&
      objects[0].bounds.width <= 345 &&
      objects[0].bounds.height >= 280 &&
      objects[0].bounds.height <= 345 &&
      objects[0].bounds.x >= 90 &&
      objects[0].bounds.x <= 140 &&
      objects[0].leftEyeOpenProbability > 0 &&
      objects[0].rightEyeOpenProbability > 0
    ) {
      return true;
    }
    return false;
  };

  const takePhoto = useCallback(async () => {
    try {
      const photo = await camera?.current
        ?.takePhoto({
          flash: "off",
        })
        .then((res) => {
          console.log("res = ", res);
          setImg(res); // tra ve path image, width,...
          setShow((last) => !last);
        });
    } catch (e) {
      if (e instanceof CameraCaptureError) {
        switch (e.code) {
          case "capture/file-io-error":
            console.error("Failed to write photo to disk!");
            break;
          default:
            console.error(e);
            break;
        }
      }
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {!show && (
        <Image
          source={{ uri: `${"file://"}${image?.path}` }}
          style={{ width: 300, height: 300 }}
        />
      )}
      {show &&
        renderCam(
          camera,
          devices?.back,
          devices?.front,
          frameProcessor,
          faces?.length === 1,
          authenFace(faces),
          rotate
        )}
      {!show && (
        <TouchableOpacity onPress={showCamera} style={styles.wrapOpenCameraBtn}>
          <Text style={{ flex: 1, marginTop: 20 }}>Press To Camera </Text>
        </TouchableOpacity>
      )}

      {show && (
        <View style={styles.wrapViewBtnTakePhoto}>
          <TouchableOpacity
            onPress={showBackCamera}
            style={styles.wrapBtnChangeTypeCamera}
          ></TouchableOpacity>
          <TouchableOpacity
            onPress={authenFace(faces) ? takePhoto : undefined}
            style={[
              styles.wrapBtnTakeCamera,
              { backgroundColor: authenFace(faces) ? "green" : "red" },
            ]}
          ></TouchableOpacity>
        </View>
      )}
      {show && (
        <>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>width: {faces?.[0]?.bounds?.width}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>height: {faces?.[0]?.bounds?.height}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>x: {faces?.[0]?.bounds?.x}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>y :{faces?.[0]?.bounds?.y}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>yawAngle :{faces?.[0]?.yawAngle}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>rollAngle :{faces?.[0]?.rollAngle}</Text>
          </View>
          <View style={{ width: 300, backgroundColor: "green" }}>
            <Text>pitchAngle :{faces?.[0]?.pitchAngle}</Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  wrapOpenCameraBtn: {
    width: "60%",
    height: 70,
    backgroundColor: "green",
    marginTop: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "space-between",
  },
  wrapViewBtnTakePhoto: {
    flexDirection: "row",
    paddingVertical: 30,
    width: "100%",
    justifyContent: "center",
  },
  wrapBtnChangeTypeCamera: {
    backgroundColor: "yellow",
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 60,
    top: "70%",
    left: 10,
    borderWidth: 5,
    borderColor: "violet",
  },
  wrapBtnTakeCamera: {
    backgroundColor: "pink",
    width: 80,
    height: 80,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: "pink",
  },
  wrapBtnFocus: {
    backgroundColor: "blue",
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 60,
    top: "70%",
    right: 10,
  },
  wrapSelfCamera: {
    width: 330,
    height: 330,
    borderRadius: 100,
    borderWidth: 10,
    borderColor: "green",
  },
  cameraContainer: {
    width: 350,
    height: 350,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 350,
    overflow: "hidden",
    borderWidth: 10,
  },
});

export default App;
