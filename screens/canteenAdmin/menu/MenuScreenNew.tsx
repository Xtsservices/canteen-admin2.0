import React, { useState, useEffect, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Dimensions,
  AppStateStatus,
  AppState,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMenusOffline, getMenuItemsByIdOffline } from '../../offline/offlineApis/menuOfflineApis';
const { width } = Dimensions.get('window');
import { initializeDatabase } from '../../offline/database';
import type { SQLError } from 'react-native-sqlite-storage';
import RNPrint from 'react-native-print';

type MenuScreenNewNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MenuScreenNew'
>;

interface Pricing {
  id: number;
  price: number;
  currency: string;
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  image: string;
  pricing: Pricing;
}

interface MenuItemWithQuantity {
  id: number;
  menuItemItem: MenuItem;
  minQuantity: number;
  maxQuantity: number;
}

interface MenuConfiguration {
  id: number;
  name: string;
  defaultStartTime: number;
  defaultEndTime: number;
}

interface MenuDetails {
  id: number;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  menuMenuConfiguration: MenuConfiguration;
  menuItems: MenuItemWithQuantity[];
  canteenId: number;
}

interface CartResponse {
  message: string;
  data: {
    id: number;
    userId: number;
    status: string;
    totalAmount: number;
    canteenId: number;
    menuConfigurationId: number;
    menuId: number;
    updatedAt: string;
    createdAt: string;
  };
}

const MenuScreenNew: React.FC = ({ }) => {
  const [menuData, setMenuData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuDetails | null>(null);
  const [showMenuDetails, setShowMenuDetails] = useState(false);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [syncedMenuItems, setSyncedMenuItems] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeDatabase();
        setIsDbInitialized(true);
        // Check if we're offline and load from SQLite
        const isConnected = await checkNetworkConnectivity();
        setIsOffline(!isConnected);

        const db = await initializeDatabase();
        db.transaction((tx) => {
          tx.executeSql(
            'SELECT * FROM menu_items',
            [],
            (_, resultSet) => {
              const data = [];
              for (let i = 0; i < resultSet.rows.length; i++) {
                data.push(resultSet.rows.item(i));
              }

              console.log('Data loaded from SQLite:11222222', data);
              setSyncedMenuItems(data);
            },
            (error) => {
              console.error('Error loading data from database:', error);
            }
          );
        });
        
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Function to check network connectivity using fetch
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Network connectivity check failed:', error);
      return false;
    }
  };

  // Check connectivity and update state
  const updateConnectivityStatus = async (): Promise<void> => {
    try {
      const isConnected = await checkNetworkConnectivity();
      setIsOffline(!isConnected);
      console.log('Connection status:', isConnected ? 'online' : 'offline');
    } catch (error) {
      console.error('Failed to update connectivity status:', error);
      setIsOffline(true); // Assume offline if check fails
    }
  };

  useEffect(() => {
    updateConnectivityStatus();
    const intervalId = setInterval(updateConnectivityStatus, 30000);
    const appStateHandler = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateConnectivityStatus();
      }
    };
    const appStateSubscription = AppState.addEventListener('change', appStateHandler);
    // Clean up
    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, []);

  const loadMenuItems = async () => {
    if (!isDbInitialized) return;

    try {
      const offlineData = await getAllMenusOffline();
      console.log('Offline Data:', offlineData);

      if (offlineData?.data) {
        setMenuData(offlineData.data);
        const apiDates = Object.keys(offlineData.data).sort((a, b) => {
          const dateA = new Date(a.split('-').reverse().join('-'));
          const dateB = new Date(b.split('-').reverse().join('-'));
          return dateA.getTime() - dateB.getTime();
        });
        setDates(apiDates);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load menu items');
      console.error('Load error:', error);
    }
  };

  useEffect(() => {
    // Fetch menu data 
    const fetchMenuData = async () => {
      try {
        const token = await AsyncStorage.getItem('authorization');
        if (!token) {
          console.error('No token found in AsyncStorage');
          return;
        }

        let response = await fetch(
          `https://server.welfarecanteen.in/api/menu/getMenusForNextTwoDaysGroupedByDateAndConfiguration?canteenId=`,
          {
            method: 'GET',
            headers: {
              Authorization: token,
            },
          }
        );

        const data = await response.json();
        console.log('Menu Data:', data);

        if (data?.data) {
          setMenuData(data.data);
          const apiDates = Object.keys(data.data).sort((a, b) => {
            const dateA = new Date(a.split('-').reverse().join('-'));
            const dateB = new Date(b.split('-').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
          });
          setDates(apiDates);
        }
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
    if (isOffline) {
      loadMenuItems();
    }
  }, [isOffline, isDbInitialized]);

  // Fetch menu details by ID


  // Add item to cart
  const addToCart = async (itemId: number, quantity: number) => {
    if (!selectedMenu) return;

    try {
      setAddingToCart(itemId);
      const token = await AsyncStorage.getItem('authorization');
      if (!token) {
        console.error('No token found in AsyncStorage');
        return;
      }

      const cartData = {
        itemId,
        quantity,
        menuId: selectedMenu.id,
        canteenId: selectedMenu.canteenId,
        menuConfigurationId: selectedMenu.menuMenuConfiguration.id
      };

      const response = await fetch(
        'https://server.welfarecanteen.in/api/cart/add',
        {
          method: 'POST',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cartData),
        }
      );

      const data: CartResponse = await response.json();

      if (data.data) {
        Alert.alert(
          'Success',
          'Item added to cart successfully!',
          [
            { text: 'OK', onPress: () => console.log('OK Pressed') }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || 'Failed to add item to cart',
          [
            { text: 'OK', onPress: () => console.log('OK Pressed') }
          ]
        );
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(
        'Error',
        'An error occurred while adding to cart',
        [
          { text: 'OK', onPress: () => console.log('OK Pressed') }
        ]
      );
    } finally {
      setAddingToCart(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItemImage = (imageUrl: string) => {
    if (imageUrl) {
      return (
        <Image
          source={{
            uri: imageUrl
              ? `data:image/png;base64,${imageUrl}`
              : 'https://via.placeholder.com/150',
          }}
          style={styles.itemImage}
          resizeMode="cover"
          onError={(e) => console.log('Image error:', e.nativeEvent.error)}
        />
      );
    }
    return (
      <View style={[styles.itemImage, styles.noImage]}>
        <Text style={styles.noImageText}>No Image Available</Text>
      </View>
    );
  };

  const renderMenuDetails = () => {
    if (!selectedMenu) return null;

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowMenuDetails(false)}
        >
          <Text style={styles.backButtonText}>← Back to Menu</Text>
        </TouchableOpacity>

        <View style={styles.menuDetailsHeader}>
          <Text style={styles.menuTitle}>{selectedMenu?.name}</Text>
          <Text style={styles.menuDescription}>{selectedMenu?.description}</Text>

          <View style={styles.timingContainer}>
            <Text style={styles.timingText}>
              Menu Time: {formatTime(selectedMenu?.startTime)} - {formatTime(selectedMenu?.endTime)}
            </Text>
            <Text style={styles.timingText}>
              Default Time: {formatTime(selectedMenu?.menuMenuConfiguration?.defaultStartTime)} - {formatTime(selectedMenu?.menuMenuConfiguration?.defaultEndTime)}
            </Text>
          </View>
        </View>

        <FlatList
          data={selectedMenu.menuItems}
          keyExtractor={(item) => item?.id?.toString()}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.menuItem}>
              {renderItemImage(item?.menuItemItem?.image)}
              <Text style={styles.itemName}>{item?.menuItemItem?.name}</Text>
              <Text style={styles.itemDescription}>{item?.menuItemItem?.description}</Text>
              <Text style={styles.itemPrice}>
                {item?.menuItemItem?.pricing?.currency} {item?.menuItemItem?.pricing?.price}
              </Text>
              <Text style={styles.quantityRange}>
                Quantity: {item?.minQuantity}-{item?.maxQuantity}
              </Text>

              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={() => addToCart(item?.menuItemItem?.id, item?.minQuantity)}
                disabled={addingToCart === item?.id}
              >
                {addingToCart === item?.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.menuItemsContainer}
        />
      </View>
    );
  };


 const checkIfDataSynced = async (): Promise<boolean> => {
    const isSynced = await AsyncStorage.getItem('isMenuSynced');
    return isSynced === 'true';
  };


  // Sync Menu Button Logic

  // Check if data is already synced on component mount
  useEffect(() => {
    const checkSyncStatus = async () => {
      const isSynced = await checkIfDataSynced();
      if (isSynced) {
        loadDataFromDatabase(); // Load data from SQLite if already synced
      }
    };

    checkSyncStatus();
  }, []);

  const renderMenuList = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}> Explore the Menu</Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#10B981',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 16,
          }}
          onPress={async () => {
            try {
              const token = await AsyncStorage.getItem('authorization');
              if (!token) {
                Alert.alert('Error', 'No token found');
                return;
              }

              const menuId = 1;
              const response = await fetch(
                `https://server.welfarecanteen.in/api/menu/getMenuById?id=${menuId}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: token,
                  },
                }
              );
              const apiData = await response.json();
              if (!apiData?.data) {
                Alert.alert('Error', 'No menu data found');
                return;
              }

              console.log('API Data:', apiData.data);

              // Prepare SQLite insert logic
              const db = await initializeDatabase();

              db.transaction(tx => {
                // Create tables if not exist

                tx.executeSql(
                  `INSERT OR REPLACE INTO menus ( name, description, startTime, endTime, createdAt, updatedAt, menuConfigurationId, menuId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    apiData.data.name,
                    apiData.data.description,
                    apiData.data.startTime,
                    apiData.data.endTime,
                    apiData.data.createdAt,
                    apiData.data.updatedAt,
                    apiData.data.menuConfigurationId,
                    apiData.data.id
                  ]
                );

                apiData.data.menuItems.map((menuItem: any) => {
                  tx.executeSql(
                    `INSERT OR REPLACE INTO menu_items (menuId, itemId, itemName, minQuantity, maxQuantity, price) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      menuItem.menuId,
                      menuItem.itemId,
                      menuItem.item?.name || '',
                      menuItem.minQuantity,
                      menuItem.maxQuantity,
                      menuItem.item?.pricing?.price ?? 0
                    ],
                    () => console.log(`Inserted item ${menuItem.item?.name} into menu_items successfully`),
                  );

                  // Now get the count
                  tx.executeSql(
                    "SELECT COUNT(*) AS count FROM menu_items", // Replace 'orders' with your table name
                    [],
                    (txObj2, countResult) => {
                      const count = countResult.rows.item(0).count;
                      console.log('Total count:', count);

                      // Optional: combine data + count into one object
                      const result = { count };
                      console.log('Order Item Result:', result);
                    },
                    (error: SQLError) => {
                      console.log('Error fetching tables', error);
                    }

                  );
                });

                console.log('Synced Menu Items:', apiData.data.menuItems);


              });
            } catch (err) {
              console.error('Sync error:', err);
              Alert.alert('Error', 'Sync failed');
            }
          }}

        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sync Menu</Text>
        </TouchableOpacity>

        <View>
          {syncedMenuItems.length > 0 && (
            <FlatList
              data={syncedMenuItems}
              keyExtractor={(item) => item?.id?.toString()}
              renderItem={({ item }) => {
                const quantity = quantities[item?.id] || item?.minQuantity || 1;

                console.log('Synced Menu Items:', item);
                console.log('Synced Menu Items:', syncedMenuItems.length);

                const increaseQuantity = () => {
                  if (quantity < item?.maxQuantity) {
                    setQuantities((prev) => ({
                      ...prev,
                      [item?.id]: quantity + 1,
                    }));
                  }
                };

                const decreaseQuantity = () => {
                  if (quantity > item?.minQuantity) {
                    setQuantities((prev) => ({
                      ...prev,
                      [item?.id]: quantity - 1,
                    }));
                  }
                };

                return (
                  <View
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                      {item?.itemName}
                    </Text>
                    {/* <Text style={{ marginBottom: 4 }}>{item?.item?.description}</Text> */}
                    <Text style={{ marginBottom: 8 }}>
                      Price: ₹ {item?.price}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <TouchableOpacity
                        onPress={decreaseQuantity}
                        style={{
                          backgroundColor: '#E5E7EB',
                          padding: 8,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{quantity}</Text>
                      <TouchableOpacity
                        onPress={increaseQuantity}
                        style={{
                          backgroundColor: '#E5E7EB',
                          padding: 8,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Phone Number:</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
              }}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              onChangeText={(text) => setPhoneNumber(text)}
              value={phoneNumber}
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={async () => {
                try {
                  const db = await initializeDatabase();
                  const totalPrice = syncedMenuItems.reduce((total, item) => {
                    const quantity = quantities[item?.id] || item?.minQuantity || 1;
                    return total + (item?.item?.pricing?.price || 0) * quantity;
                  }, 0);

                  db.transaction((tx) => {
                    tx.executeSql(
                      "SELECT * FROM walkin_items",
                      [],
                      (txObj, resultSet) => {
                        const data: Array<{ [key: string]: any }> = [];
                        for (let i = 0; i < resultSet.rows.length; i++) {
                          data.push(resultSet.rows.item(i));
                        }
                        console.log('Data:', data);

                        tx.executeSql(
                          "SELECT COUNT(*) AS count FROM walkin_items",
                          [],
                          (txObj2, countResult) => {
                            const count = countResult.rows.item(0).count;
                            console.log('Total count of walkin items', count);
                            const result = { data, count };
                            console.log('Order Item Result walkin items', result);
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
                    tx.executeSql(
                      "SELECT * FROM walkins",
                      [],
                      (txObj, resultSet) => {
                        const data: Array<{ [key: string]: any }> = [];
                        for (let i = 0; i < resultSet.rows.length; i++) {
                          data.push(resultSet.rows.item(i));
                        }
                        console.log('Data:', data);

                        tx.executeSql(
                          "SELECT COUNT(*) AS count FROM walkins",
                          [],
                          (txObj2, countResult) => {
                            const count = countResult.rows.item(0).count;
                            console.log('Total count:', count);
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

                    tx.executeSql(
                      `DROP TABLE IF EXISTS walkins`,
                      [],
                      () => console.log('Dropped walkins table successfully'),
                      (error: SQLError) => {
                        console.error('Error dropping walkins table:', error);
                        return false;
                      }
                    );

                    tx.executeSql(
                      `CREATE TABLE IF NOT EXISTS walkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                menuid INTEGER NOT NULL,
                phone TEXT,
                price REAL,
                createdate TEXT
                )`,
                      [],
                      () => console.log('Created walkins table successfully'),
                      (error: SQLError) => {
                        console.error('Error creating walkins table:', error);
                        return false;
                      }
                    );

                    tx.executeSql(
                      `CREATE TABLE IF NOT EXISTS walkin_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                walkinId INTEGER,
                menuItemId INTEGER,
                itemName TEXT,
                quantity INTEGER,
                unitPrice REAL,
                FOREIGN KEY (walkinId) REFERENCES walkins (id)
                )`,
                      [],
                      () => console.log('Created walkin_items table successfully'),
                      (error: SQLError) => {
                        console.error('Error creating walkin_items table:', error);
                        return false;
                      }
                    );

                    const createdate = new Date().toISOString();
                    tx.executeSql(
                      `INSERT INTO walkins (menuid, phone, price, createdate) VALUES (?, ?, ?, ?)`,
                      [1, phoneNumber, totalPrice, createdate],
                      (_, result) => {
                        console.log('Inserted into walkins table successfully:', result);
                        const walkinId = result.insertId;

                        syncedMenuItems.forEach((item) => {
                          const quantity = quantities[item?.id] || item?.minQuantity || 1;
                          tx.executeSql(
                            `INSERT INTO walkin_items (walkinId, menuItemId, itemName, quantity, unitPrice) VALUES (?, ?, ?, ?, ?)`,
                            [
                              walkinId,
                              item?.item?.id as number,
                              item?.item?.name as string,
                              quantity as number,
                              item?.item?.pricing?.price as number,
                            ],
                            () => console.log(`Inserted item ${item?.item?.name} into walkin_items successfully`),
                            // (error: SQLError) => {
                            //   console.error(`Error inserting item ${item?.item?.name} into walkin_items:`, error);
                            // }
                          );
                        });
                      },
                      (error) => {
                        console.error('Error inserting into walkins:', error);
                        return false;
                      }
                    );
                  });

                  // Print the receipt
                  const printReceipt = async () => {
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
              <div class="header">Welfare Canteen</div>
              <div class="section">
                <div class="row">
                  <span class="label">Phone Number:</span>
                  <span class="value">${phoneNumber}</span>
                </div>
                <div class="row">
                  <span class="label">Date:</span>
                  <span class="value">${new Date().toLocaleString()}</span>
                </div>
              </div>
              <div class="section">
                <h3>Order Items</h3>
                ${syncedMenuItems
                        .map(
                          (item) => {
                            const quantity = quantities[item?.id] || item?.minQuantity || 1;
                            const price = item?.price || 0;
                            const currency ='₹';
                            return `
                  <div class="row">
                    <span class="label">${item?.itemName}</span>
                    <span class="value">${currency} ${price} x ${quantity} = ${currency} ${price * quantity}</span>
                  </div>
                `;
                          }
                        )
                        .join('')}
              </div>
              <div class="section">
                <div class="row">
                  <span class="label">Total Price:</span>
                  <span class="value">₹${totalPrice}</span>
                </div>
              </div>
              <div class="section" style="text-align: center;">
                <h3>Powered by Worldtek.in</h3>
                <p>For any queries, please contact</p>
                <a href="tel:+919167777777">+91 7893989898</a>
              </div>
            </body>
                </html>
              `;

                    try {
                      await RNPrint.print({
                        html: printContent,
                      });
                      // Reset only phone number and quantities, keep menu open
                      setPhoneNumber('');
                      // Reset quantities to minQuantity for each item
                      setQuantities(
                        syncedMenuItems.reduce((acc, item) => {
                          acc[item?.id] = item?.minQuantity || 1;
                          return acc;
                        }, {} as { [key: number]: number })
                      );
                      Alert.alert('Success', 'Receipt printed and data reset.');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to print the receipt.');
                    }
                  };

                  await printReceipt();
                } catch (err) {
                  console.error('Error saving or printing:', err);
                  Alert.alert('Error', 'Failed to save or print');
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save and Print Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView >
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 50 }} />
      ) : showMenuDetails ? (
        renderMenuDetails()
      ) : (
        renderMenuList()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#1F2937',
    fontSize: 16,
  },
  header: {
    marginTop: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dateHeader: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#6366F1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    marginHorizontal: '1.5%',
  },
  categoryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noMenuText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  menuDetailsHeader: {
    padding: 16,
    paddingTop: 80,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  menuDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  timingContainer: {
    backgroundColor: '#E5E7EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  timingText: {
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
    marginVertical: 2,
  },
  menuItemsContainer: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  menuItem: {
    width: '31%',  // 31% allows for 3 items with spacing
    backgroundColor: '#FFFFFF',
    padding: 12,   // Slightly reduced padding
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: '100%',
    height: 120, // Reduced from 200 to better fit cards
    borderRadius: 8,
    marginBottom: 8,
  },
  noImage: {
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  noImageText: {
    color: '#6B7280',
    fontSize: 16,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 8,
  },
  quantityRange: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  addToCartButton: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});



export default MenuScreenNew;

function loadDataFromDatabase() {
  throw new Error('Function not implemented.');
}
