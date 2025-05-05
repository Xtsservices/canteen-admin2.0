import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

type RootStackParamList = {
  BluetoothControl: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'BluetoothControl'>;

const {width, height} = Dimensions.get('window');

const isTablet = width >= 768; // You can adjust this threshold if needed

const VerifyTokenScreen = () => {
  const [token, setToken] = useState<string[]>(Array(6).fill(''));
  const navigation = useNavigation<NavigationProp>();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  console.log('Token:', token);

  const handleTokenChange = (value: string, index: number) => {
    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    if (value && index < token.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = () => {
    if (token.some(digit => digit === '')) {
      Alert.alert('Error', 'Please fill in all token fields.');
    } else {
      Alert.alert('Success', 'Token verified successfully!');
    }
  };

  const handleScanQRCode = () => {
    if (useIsFocused()) {
      navigation.navigate('BluetoothControl');
    } else {
      Alert.alert('Error', 'Camera is not accessible at the moment.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Token Number</Text>

      <View style={styles.tokenContainer}>
        {token.map((digit, index) => (
          <TextInput
            key={index}
            style={styles.tokenInput}
            maxLength={1}
            keyboardType="numeric"
            value={digit}
            onChangeText={value => handleTokenChange(value, index)}
            ref={ref => {
              inputRefs.current[index] = ref;
            }}
            onKeyPress={({nativeEvent}) => {
              if (nativeEvent.key === 'Backspace' && index > 0 && !digit) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </View>

      <Text style={styles.orText}>OR</Text>

      <TouchableOpacity style={styles.scanButton} onPress={handleScanQRCode}>
        <Text style={styles.scanButtonText}>SCAN QR CODE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: isTablet ? width * 0.15 : width * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: isTablet ? 32 : 24,
    fontWeight: 'bold',
    marginBottom: isTablet ? 40 : 30,
  },
  tokenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: isTablet ? 40 : 30,
  },
  tokenInput: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    borderWidth: 1,
    borderColor: '#000',
    textAlign: 'center',
    fontSize: isTablet ? 30 : 24,
    marginHorizontal: isTablet ? 15 : 10,
    borderRadius: 10,
  },
  orText: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    marginVertical: isTablet ? 40 : 30,
  },
  scanButton: {
    backgroundColor: '#000080',
    paddingVertical: isTablet ? 20 : 15,
    paddingHorizontal: isTablet ? 40 : 30,
    borderRadius: 10,
    marginBottom: isTablet ? 40 : 30,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  verifyButton: {
    borderWidth: 1,
    borderColor: '#000080',
    paddingVertical: isTablet ? 20 : 15,
    paddingHorizontal: isTablet ? 40 : 30,
    borderRadius: 10,
  },
  verifyButtonText: {
    color: '#000080',
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
});

export default VerifyTokenScreen;
