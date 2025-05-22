import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../offline/database';
import { SQLError } from 'react-native-sqlite-storage';
import MenuScreenNew from './menu/MenuScreenNew';

type AdminDashboardNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AdminDashboard'
>;

interface DashboardData {
  totalOrders: number;
  totalAmount: number;
  completedOrders: number;
  cancelledOrders: number;
  totalItems: number;
  totalCanteens: number;
  totalMenus: number;
}

const AdminDashboard = () => {
  const navigation = useNavigation<AdminDashboardNavigationProp>();
  const route = useRoute();
  const { width, height } = useWindowDimensions();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('authorization');
      const response = await fetch('https://server.welfarecanteen.in/api/adminDasboard/dashboard', {
        headers: {
          Authorization: token || '',
        },
      });
      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    loadData();
    return unsubscribe;
  }, [navigation]);

  const handleGetAllOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('authorization');
      const response = await fetch('https://server.welfarecanteen.in/api/order/getAllOrders', {
        method: 'GET',
        headers: {
          Authorization: token || '',
        },
      });

      const data = await response.json();

      // Open SQLite database
      const db = await getDatabase();
      // Create tables if not exist
      db.transaction(tx => {
        tx.executeSql(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
          [],
          (txObj: any, resultSet: { rows: { length: number; item: (index: number) => { name: string } } }) => {
            const tables: string[] = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              tables.push(resultSet.rows.item(i).name);
            }
            console.log('Tables:', tables);
          },
          (error: SQLError) => {
            console.log('Error fetching tables', error);
          }
        );
      });

      db.transaction(tx => {
        // Get all rows
        tx.executeSql(
          "SELECT * FROM orders", // Replace 'users' with your table name
          [],
          (txObj, resultSet) => {
            const data: Array<{ [key: string]: any }> = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            // console.log('Data:', data);

            // Now get the count
            tx.executeSql(
              "SELECT COUNT(*) AS count FROM orders", // Replace 'orders' with your table name
              [],
              (txObj2, countResult) => {
                const count = countResult.rows.item(0).count;
                console.log('Total count:', count);

                // Optional: combine data + count into one object
                const result = { data, count };
                console.log('Combined Result:');
              },
              (error: SQLError) => {
                console.log('Error fetching tables', error);
              }
            );
          },
          (error: SQLError) => {
            console.log('Error fetching tables', error);
          }
        );
      });
      // const abc = `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`

      // const result: any = await db.executeSql(abc, []);
      // console.log('Tables:', result); // Log the tables to check their structure

      // Insert data into tables
      if (!data || typeof data !== 'object' || !Array.isArray(data.data)) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid data format: Expected an object with a "data" array containing orders');
      }

      const orders = data.data; // Assuming the orders are inside the "data" array
      // console.log('Orders123456789:', orders); // Log the orders to check their structure
      if (!Array.isArray(orders)) {
        console.error('Invalid orders format:', orders);
        throw new Error('Invalid orders format: Expected an array of orders');
      }

      db.transaction(tx => {
        // Get all rows
        tx.executeSql(
          "SELECT * FROM order_items", // Replace 'users' with your table name
          [],
          (txObj, resultSet) => {
            const data: Array<{ [key: string]: any }> = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            console.log('Data:', data);

            // Now get the count
            tx.executeSql(
              "SELECT COUNT(*) AS count FROM order_items", // Replace 'orders' with your table name
              [],
              (txObj2, countResult) => {
                const count = countResult.rows.item(0).count;
                console.log('Total count:', count);

                // Optional: combine data + count into one object
                const result = { data, count };
                console.log('Order Item Result:', result);
              },
              (error: SQLError) => {
                console.log('Error fetching tables', error);
              }
            );
          },
          (error: SQLError) => {
            console.log('Error fetching tables', error);
          }
        );
      });


      db.transaction((tx) => {
        // console.log('Transaction started...', data);
        // console.log('Inserting orders and order items...');
        // console.log('Orders:', data.data); // Log the orders to check their structure
        orders.map((myorder) => {
          // console.log('Inserting order:', myorder); // Log each order before inserting
          tx.executeSql(
            `INSERT OR REPLACE INTO orders (
              id, userId, totalAmount, status, canteenId, menuConfigurationId, createdById, updatedById, qrCode, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              myorder.id,
              myorder.userId,
              myorder.totalAmount,
              myorder.status,
              myorder.canteenId,
              myorder.menuConfigurationId,
              myorder.createdById,
              myorder.updatedById,
              myorder.qrCode,
              myorder.createdAt,
              myorder.updatedAt,
            ],
            () => {
              // console.log(`Order with ID ${myorder.id} inserted successfully.`, myorder);
            },
            (error: SQLError) => {
              console.error(`Failed to insert order with ID ${myorder.id}:`, error);
            }
          );


          if (Array.isArray(myorder.orderItems)) {
            console.log('Inserting order items:'); // Log each order item before inserting
            myorder.orderItems.map((item: any) => {
              console.log('@@@@@@@@@@@ :',); // Log each order item before inserting
              tx.executeSql(

                `INSERT OR REPLACE INTO order_items (
                  id, orderId, itemId, quantity, price, total, createdById, updatedById, itemName, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.id,
                  item.orderId,
                  item.itemId,
                  item.quantity,
                  item.price,
                  item.total,
                  item.createdById,
                  item.updatedById,
                  item.menuItemItem?.name || '', // Safely access name
                  item.createdAt,
                  item.updatedAt,
                ], () => {
                  console.log(`Order with ID inserted successfully.`, item);
                },
                (error: SQLError) => {
                  console.error(`Failed to insert order with ID ${myorder.id}:`, error);
                }

              );
            });
          }
        })
      });

      db.transaction(tx => {
        // Get all rows
        tx.executeSql(
          "SELECT * FROM order_items", // Replace 'users' with your table name
          [],
          (txObj, resultSet) => {
            const data: Array<{ [key: string]: any }> = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            console.log('Data:', data);

            // Now get the count
            tx.executeSql(
              "SELECT COUNT(*) AS count FROM order_items", // Replace 'orders' with your table name
              [],
              (txObj2, countResult) => {
                const count = countResult.rows.item(0).count;
                console.log('Total count:', count);

                // Optional: combine data + count into one object
                const result = { data, count };
                console.log('Order Item Result:', result);
              },
              (error: SQLError) => {
                console.log('Error fetching tables', error);
              }
            );
          },
          (error: SQLError) => {
            console.log('Error fetching tables', error);
          }
        );
      });

      // console.log('Tables created successfully!');

      const orderCount = 'SELECT COUNT(*) AS count FROM orders';

      const getOrderCount = () =>
        new Promise((resolve, reject) => {
          db.transaction((tx) => {
            tx.executeSql(
              orderCount,
              [],
              (_, result) => resolve(result),
              (error: SQLError) => {
                console.error(`Failed to insert order with ID`, error);
              }
            );
          });
        });
      try {
        const result: any = await getOrderCount();
        const count = result.rows.item(0).count;
        // console.log('Orders count:', count);
      } catch (error) {
        console.error('Error fetching order count:', error);
      }


      Alert.alert('Orders fetched and stored successfully!');
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error fetching orders:', error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const cardSize = Math.min(width * 0.6, height * 0.6);
  const isPortrait = height >= width;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  const renderWalkIn = () => {
    navigation.navigate('MenuScreenNew');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Restaurant Dashboard</Text>
        <TouchableOpacity
          style={styles.usersButton}
          onPress={() => navigation.navigate('Users', { newUser: undefined })}
        >
          <Text style={styles.usersButtonText}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGetAllOrders}>
          <Text>Sync Orders</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* Stats Overview */}
        {dashboardData && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dashboardData.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{dashboardData.totalAmount}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dashboardData.completedOrders}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.centerContainer}>
          <View style={[styles.middleRow, isPortrait && styles.middleColumn]}>
            {/* QR Scan Card */}
            <TouchableOpacity
              style={[
                styles.squareCard,
                {
                  width: cardSize,
                  height: cardSize,
                  marginRight: isPortrait ? 0 : 20,
                  marginBottom: isPortrait ? 20 : 0,
                },
              ]}
              onPress={() => navigation.navigate('BluetoothControl')}
            >
              <Image
                source={{
                  uri: 'https://images.pexels.com/photos/1122528/pexels-photo-1122528.jpeg',
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Quick Scan</Text>
                <Text style={styles.cardDescription}>Scan QR Code</Text>
              </View>
            </TouchableOpacity>

            {/* Walk-ins Card */}
            <TouchableOpacity
              style={[
                styles.squareCard,
                {
                  width: cardSize,
                  height: cardSize,
                },
              ]}
              onPress={renderWalkIn}
            >
              <Image
                source={{
                  uri: 'https://images.pexels.com/photos/4253320/pexels-photo-4253320.jpeg',
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Walk-ins</Text>
                <Text style={styles.cardDescription}>Manage customers</Text>
              </View>

            </TouchableOpacity>
          </View>
          {/* <View style={[styles.middleRow, isPortrait && styles.middleColumn]}>
            {renderWalkIn()}
          </View>  */}
        </View>
      </ScrollView>

      {/* Orders Counter */}
      <TouchableOpacity
        style={styles.ordersCounter}
        onPress={() => navigation.navigate('OrderDetails', { orderId: '12345' })}
      >
        <Text style={styles.ordersCounterText}>
          Orders: {dashboardData?.totalOrders || 0}
        </Text>
        <Text style={styles.ordersCounterSubtext}>
          ₹{dashboardData?.totalAmount || 0} total
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a237e',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 5,
      },
    }),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  usersButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  usersButtonText: {
    color: '#1a237e',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    width: '30%',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  squareCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s ease-in-out',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: '70%',
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: '30%',
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  ordersCounter: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        elevation: 5,
      },
    }),
  },
  ordersCounterText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ordersCounterSubtext: {
    color: '#e8eaf6',
    fontSize: 14,
    marginTop: 5,
  },
});

export default AdminDashboard;
