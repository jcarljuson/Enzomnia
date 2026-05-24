# Enzomnia Cafe: OOP Design Plan

This document outlines the software design plan and structural architecture for the **Enzomnia Cafe** application, illustrating how modern Object-Oriented Programming (OOP) concepts are implemented in the TypeScript codebase.

---

## 1. Encapsulation
Encapsulation is the practice of bundling data (properties) and methods together into a single unit (a class) and restricting direct access to the internal state of that object to protect data integrity.

*   **Access Modifiers**: All fields in the domain classes (such as `Product`, `Order`, `User`, `Payment`, and `CartItem`) are marked as `private` or `protected` to prevent external code from mutating properties directly.
    *   *Example*: The attributes `#productId`, `#name`, `#price`, `#mode`, and `#stock` in the [Product](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Product.ts#L1) class are protected.
*   **Getters & Setters**: Read-only public accessor methods (getters) are provided to safely expose internal data without allowing direct mutation.
    *   *Example*: `getProductId()`, `getName()`, `getPrice()`, `getStock()`.
*   **State-Mutating Interfaces**: Changes to an object's state are exclusively managed via public methods that validate operations, protecting the internal business rules.
    *   *Example*: The [Product](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Product.ts#L25) class has a `reduceStock(qty)` method to safely modify the stock count instead of letting external code set the stock directly.
    *   *Example*: In the [Cart](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Cart.ts#L27) class, the `items` collection is modified using `addItem(p, qty)` and `removeItem(prodId)`, which internally trigger `recalculateTotal()` to keep the total price in sync automatically.

---

## 2. Inheritance
Inheritance allows new classes (subclasses) to acquire the attributes and behaviors of an existing class (superclass), promoting code reuse and establishing clear taxonomic hierarchies.

*   **Product Hierarchy**: The abstract [Product](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Product.ts#L1) class serves as a superclass that aggregates common properties like price, stock, and mode.
    *   `Beverage` extends `Product` to inherit all baseline traits while introducing unique attributes: `size` and `isHot`.
    *   `FoodItem` extends `Product` and adds a specialized `dietType` property.
*   **Order Hierarchy**: The abstract [Order](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Order.ts#L1) superclass encapsulates mutual ticketing details (`orderId`, `customerName`, `totalAmount`, `status`).
    *   `DineInOrder` extends `Order` and implements table management (`tableNo`, `guests`, `assignTable()`).
    *   `PickupOrder` extends `Order` and handles scheduling details (`pickupTime`, `qrCode`, `generateQRCode()`).
*   **User Hierarchy**: The abstract [User](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/User.ts#L1) class defines shared account details (`userId`, `name`, `email`, `phone`).
    *   `GuestUser` extends `User` to facilitate temporary shopping sessions (`sessionId`).
    *   `RegisteredUser` extends `User` to support member preferences (`prefMode`).
*   **Payment Hierarchy**: The abstract [Payment](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Payment.ts#L5) superclass encapsulates transactional state (`paymentId`, `amount`, `status`).
    *   `CreditCard` extends `Payment` to process credit accounts via `cardNo`.
    *   `CashPayment` extends `Payment` to handle physical currency via `cashTender`.

---

## 3. Polymorphism
Polymorphism allows objects of different classes to be treated as instances of a common superclass, enabling uniform interfaces to invoke unique, specialized behaviors at runtime.

*   **Abstract Method Overriding**: The abstract [User](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/User.ts#L14) class declares an abstract method `login(): boolean`. When called, the runtime dynamically dispatches the call to the appropriate subclass implementation:
    *   `GuestUser.login()` returns `true` (instantly granting an anonymous shopping session).
    *   `RegisteredUser.login()` validates credential tokens against standard records.
*   **Polymorphic Collections**: In [script.ts](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/script.ts#L11), the `allProducts` array is typed as a collection of `Product[]`. It polymorphicly holds references to both `Beverage` and `FoodItem` objects.
*   **Polymorphic Algorithms**: The `ModeManager.filterMenu(products, mode)` function operates on a polymorphic array of `Product[]`. It filters the items and processes properties uniformly without needing to identify or type-cast specific subclasses.
*   **Polymorphic Execution in Checkout**: During checkout, the app executes `payment.process()`. Whether using `CreditCard` or `CashPayment`, the transaction is processed seamlessly using the same method name, abstracting away the concrete implementation.

---

## 4. Interface or Abstract Class
Both construct boundaries and abstract definitions, but they are used in distinct structural scenarios:

### Abstract Class
*   **Definition**: A class that cannot be instantiated on its own and serves as a partial template containing both defined state (variables) and implementation code (concrete methods) alongside abstract method declarations.
*   **Usage Criteria**: Used when classes share a strong **"IS-A"** relationship and require shared logic or properties.
*   **Implementation**:
    *   [Product](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Product.ts#L1): Used as an abstract class because all menu items *are* products. They share standard states (`productId`, `price`, `stock`, `image`) and concrete implementations (`reduceStock()`, `getPrice()`).
    *   [Order](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Order.ts#L1): Used as an abstract class because all transactions *are* orders. They share concrete properties (`orderId`, `totalAmount`) and concrete helper methods (`getOrderId()`, `calculateTotal()`).

### Interface
*   **Definition**: A pure behavioral contract that declares a set of method signatures without providing any state (variables) or concrete code implementations.
*   **Usage Criteria**: Used when classes share a **"CAN-DO"** relationship (a behavioral contract), allowing totally unrelated classes to implement the same operations.
*   **Implementation**:
    *   [IPayment](file:///c:/Users/jcarl/Downloads/enzomnia-main/enzomnia-main/classes/Payment.ts#L1): Modeled as an interface because it defines a strict capability contract (`process(): boolean`). Any transaction handler, whether local, cloud-based, or third-party, must implement this behavior.

---

## 5. Planned Classes

### Core Domain Models
1.  **Product** *(Abstract Class)*: Houses standard details for products.
    *   *Methods*: `getProductId()`, `getName()`, `getPrice()`, `getMode()`, `getStock()`, `getImage()`, `reduceStock(qty)`.
2.  **Beverage** *(Subclass of Product)*: Captures drink items.
    *   *Properties*: `size: string`, `isHot: boolean`.
    *   *Methods*: `getSize()`, `getIsHot()`.
3.  **FoodItem** *(Subclass of Product)*: Captures pastry and food items.
    *   *Properties*: `dietType: string`.
    *   *Methods*: `getDietType()`.
4.  **CartItem**: Combines a `Product` reference with a selected quantity.
    *   *Properties*: `product: Product`, `quantity: number`, `itemPrice: number`.
    *   *Methods*: `getProduct()`, `getQuantity()`, `setQuantity(qty)`, `calcTotal()`.
5.  **Cart**: Manages a user's selected items and handles the checkout transition.
    *   *Properties*: `cartId: string`, `userId: string`, `items: CartItem[]`, `total: number`.
    *   *Methods*: `addItem(p, qty)`, `removeItem(prodId)`, `recalculateTotal()`, `checkout()`.
6.  **Order** *(Abstract Class)*: Base structure for purchase invoices.
    *   *Properties*: `orderId: string`, `customerName: string`, `orderDateTime: string`, `totalAmount: number`, `status: string`, `modeAtOrder: string`.
    *   *Methods*: `getOrderId()`, `calculateTotal()`, `displayOrderInfo()`.
7.  **DineInOrder** *(Subclass of Order)*: Handles internal table-service orders.
    *   *Properties*: `tableNo: number`, `guests: number`.
    *   *Methods*: `assignTable(table)`.
8.  **PickupOrder** *(Subclass of Order)*: Handles scheduled pickup orders.
    *   *Properties*: `pickupTime: string`, `qrCode: string`.
    *   *Methods*: `generateQRCode()`.
9.  **User** *(Abstract Class)*: Base properties and behaviors for customer entities.
    *   *Properties*: `userId: string`, `name: string`, `email: string`, `phone: string`.
    *   *Methods*: `login()*`, `viewOrders()`.
10. **GuestUser** *(Subclass of User)*: For anonymous shopping users.
    *   *Properties*: `sessionId: string`.
    *   *Methods*: `login()`.
11. **RegisteredUser** *(Subclass of User)*: For registered account holders.
    *   *Properties*: `prefMode: string`.
    *   *Methods*: `login()`.
12. **IPayment** *(Interface)*: Behavioral contract for payment modules.
    *   *Methods*: `process()*`.
13. **Payment** *(Abstract Class implementing IPayment)*: Abstract base for financial operations.
    *   *Properties*: `paymentId: string`, `amount: number`, `status: string`.
    *   *Methods*: `process()*`.
14. **CreditCard** *(Subclass of Payment)*: Handles card transactions.
    *   *Properties*: `cardNo: string`.
    *   *Methods*: `process()`.
15. **CashPayment** *(Subclass of Payment)*: Handles cash transactions.
    *   *Properties*: `cashTender: number`.
    *   *Methods*: `process()`.

### Coordinator & Utility Service Classes
16. **ModeManager** *(Static Class)*: Controls the visual theme state (Day/Night), menu filters, and gyroscope shake detection.
    *   *Properties*: `currentMode: 'Day' | 'Night'`, `lastToggle: number`.
    *   *Methods*: `toggleMode()`, `applyTheme()`, `detectShake()`, `filterMenu(products, mode)`.
17. **FileManager** *(Static Class)*: Serializes transaction data, handling receipt downloads and inventory database backups.
    *   *Methods*: `saveReceipt(order, items)`, `exportInventory(products)`.
18. **Script** *(Application Orchestrator)*: The central client bootstrap class. Houses initialization arrays, runs global page listeners, coordinates UI updates, and implements the **`main()` entry point** inside the `DOMContentLoaded` lifecycle.
    *   *Properties*: `allProducts: Product[]`, `myCart: Cart`, `isLoggedIn: boolean`, `lenis: Lenis`.
    *   *Methods*: `main()`, `renderProducts()`, `addToCart(productId)`, `removeFromCart(productId)`, `updateCartUI()`, `toggleCart()`, `showModal(message)`, `handleAuthClick()`, `handleCredentialResponse(response)`, `parseJwt(token)`, `createLeaf(container)`.
