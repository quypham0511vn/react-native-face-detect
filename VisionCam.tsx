import React, { forwardRef, useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from 'react-native';
import { runOnJS } from "react-native-reanimated";
import { Camera, useCameraDevices, useFrameProcessor } from "react-native-vision-camera";
import { Face, scanFaces } from "vision-camera-face-detector";
 
 const VisionCam = (
    _ref?: any,
    _constainerCam?: any,
    _color?: any,
    _devices?: any,
    _framePro?: any,
  ) => {

    const [faces, setFaces] = useState<Face[]>([]);

    const frameProcessor = useFrameProcessor(async (frame) => {
        "worklet";
    
        if (frame) {
          const scannedFaces = scanFaces(frame);
          runOnJS(setFaces)(scannedFaces);
        }
      }, []);

    return(
    <View
      style={[
        _constainerCam,
        {
          borderColor: _color,
        },
      ]}>
      <Camera
        ref={_ref}
        photo={true}
        style={styles.wrapSelfCamera}
        device={_devices}
        isActive={true}
        fps={30}
        frameProcessor={_framePro}
        frameProcessorFps={1}
      />
    </View>
    );
  };


  const styles=StyleSheet.create({
    wrapSelfCamera:{
        // width: 330,
        // height: 330,
        borderRadius: 100,
        borderWidth: 10,
        borderColor: 'green',
    }
  })

  export default VisionCam;
