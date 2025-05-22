import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Touchable, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';
import RNPrint from 'react-native-print';

type PrintNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PrinterConfiguration'
>;

type Props = {
  route: {
    params: {
      token: string;
      ordersWithItems: Array<{ [key: string]: any }>;
      orderData: any;
    };
  };
};

const VerifyTokenScreen = ({ route }: Props) => {
  const navigation = useNavigation<PrintNavigationProp>();
  const { token, ordersWithItems, orderData } = route.params;

  // Calculate total quantity and amount
  const totalQuantity = ordersWithItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = ordersWithItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleOnPress = () => {
    const printContent = `
      <html>
      <head>
        <style>
        body {
          font-family: Arial, sans-serif;
          margin: 10px;
          font-size: 18px;
        }
        .header {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .section {
          margin-bottom: 10px;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .label {
          font-weight: bold;
        }
        .value {
          text-align: right;
        }
        </style>
      </head>
      <body>

        <div class="section">
        <h3>Order Summary</h3>
        <div class="row">
          <span class="label">Order ID:</span>
          <span class="value">${orderData.id}</span>
        </div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="value">${orderData.status}</span>
        </div>
        <div class="row">
          <span class="label">Total Items:</span>
          <span class="value">${totalQuantity}</span>
        </div>
        <div class="row">
          <span class="label">Total Amount:</span>
          <span class="value">₹${totalAmount}</span>
        </div>
        </div>

        <div class="section">
        <h3>Order Items</h3>
        ${ordersWithItems
      .map(
        (item) => `
          <div class="row">
          <span class="label">Item:</span>
          <span class="value">${item.itemName}</span>
          </div>
          <div class="row">
          <span class="label">Quantity:</span>
          <span class="value">${item.quantity}</span>
          </div>
          <div class="row">
          <span class="label">Price:</span>
          <span class="value">₹${item.price}</span>
          </div>
          <div class="row">
          <span class="label">Subtotal:</span>
          <span class="value">₹${item.price * item.quantity}</span>
          </div>
        `
      )
      .join('')}
        </div>
        <div class="section" style="text-align: center;">
        <h3>Powered by Worldtek.in</h3>
        <p>For any queries, please contact</p>
        <a href="tel:+919167777777">+91 7893989898</a>
        <div/>
      </body>
      </html>
    `;
    const handlePrint = async () => {
      try {
        await RNPrint.print({
          html: printContent,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to print the content.');
      }
    };

    handlePrint();
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={[styles.header, { textAlign: 'center', fontSize: 20 }]}>Industrial NDY Canteen</Text>
          <Text style={[styles.label, { textAlign: 'center', marginBottom: 8 }]}>Navel Dock Yard Canteens</Text>
          <Text style={[styles.label, { textAlign: 'center', marginBottom: 16 }]}>Canteen Name: Annapurna Canteen</Text>

          <Text style={styles.header}>Order Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Order ID:</Text>
            <Text style={styles.value}>{orderData.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{orderData.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Items:</Text>
            <Text style={styles.value}>{totalQuantity}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.header}>Order Items</Text>
          {ordersWithItems.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <View style={styles.row}>
                <Text style={styles.label}>Item:</Text>
                <Text style={styles.value}>{item.itemName}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Quantity:</Text>
                <Text style={styles.value}>{item.quantity}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Price:</Text>
                <Text style={styles.value}>₹{item.price}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Subtotal:</Text>
                <Text style={styles.value}>₹{item.price * item.quantity}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.header}>QR Code Scanned</Text>
          {ordersWithItems[0] && (
            <Image
              source={{ uri: ordersWithItems[0].qrCode }}
              style={{ width: 300, height: 300, alignSelf: 'center', marginBottom: 12 }}
            />
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#007BFF',
          padding: 10,
          borderRadius: 50,
        }}
        onPress={handleOnPress}
      >
        <Text style={{ color: 'white', fontSize: 16 }}>Confirm & Print</Text>
      </TouchableOpacity>

    </>


  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  token: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default VerifyTokenScreen;