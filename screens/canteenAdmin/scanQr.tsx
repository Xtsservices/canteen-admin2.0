import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

type RootStackParamList = {
  VerifyToken: undefined;
  AdminDashboard: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'VerifyToken'>;

const BluetoothControlScreen = () => {
  const device = useCameraDevice('back');
  const navigation = useNavigation<NavigationProp>();
  const animatedValue = useRef(new Animated.Value(0)).current;

  const {height, width} = Dimensions.get('window');
  const isPortrait = height >= width;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const handleVerifyPress = () => {
    navigation.navigate('VerifyToken');
  };

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={{color: 'white'}}>Camera not available</Text>
      </View>
    );
  }

  const translateY = animatedValue.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 250 - 2],
  });

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
      </View>

      {/* QR Code Scan Box */}
      <View style={styles.overlay}>
        <View style={styles.qrBlock}>
          <Animated.View
            style={[
              styles.redLine,
              {
                transform: [{translateY}],
              },
            ]}
          />
        </View>
      </View>

      {/* Buttons + Footer */}
      <View style={styles.overlayContent}>
        <View style={{flex: 1}} />

        <View style={styles.tokenContainer}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleVerifyPress} style={styles.button}>
            <Text style={styles.buttonText}>Show QR Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>proposed by</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrBlock: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  redLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'red',
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tokenContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    color: '#010080',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerText: {
    color: 'white',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});

export default BluetoothControlScreen;
