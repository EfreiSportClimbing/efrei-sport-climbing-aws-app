export enum EventType {
    Order = "Order",
    Payment = "Payment",
    Form = "Form",
}

export enum FormType {
    CrowdFunding = "CrowdFunding",
    Membership = "Membership",
    Event = "Event",
    Donation = "Donation",
    PaymentForm = "PaymentForm",
    Checkout = "Checkout",
    Shop = "Shop",
}

export enum ItemType {
    Donation = "Donation",
    Payment = "Payment",
    Registration = "Registration",
    Membership = "Membership",
    MonthlyDonation = "MonthlyDonation",
    MonthlyPayment = "MonthlyPayment",
    OfflineDonation = "OfflineDonation",
    Contribution = "Contribution",
    Bonus = "Bonus",
    Product = "Product",
}

export enum PriceCategory {
    Fixed = "Fixed",
    Pwyw = "Pwyw",
    Free = "Free",
}

export enum FieldType {
    Date = "Date",
    TextInput = "TextInput",
    FreeText = "FreeText",
    ChoiceList = "ChoiceList",
    File = "File",
    YesNo = "YesNo",
    Phone = "Phone",
    Zipcode = "Zipcode",
    Number = "Number",
}

export enum OrderState {
    Processed = "Processed",
    Registered = "Registered",
    Unknown = "Unknown",
    Canceled = "Canceled",
}

export enum CashOutState {
    MoneyIn = "MoneyIn",
    CantTransferReceiverFull = "CantTransferReceiverFull",
    Transfered = "Transfered",
    Refunded = "Refunded",
    Refunding = "Refunding",
    WaitingForCashOutConfirmation = "WaitingForCashOutConfirmation",
    CashedOut = "CashedOut",
    Unknown = "Unknown",
    Contested = "Contested",
    TransferInProgress = "TransferInProgress",
}

export enum PaymentMeans {
    None = "None",
    Card = "Card",
    Check = "Check",
    Cash = "Cash",
    BankTransfer = "BankTransfer",
    Other = "Other",
}

export enum PaymentState {
    Pending = "Pending",
    Authorized = "Authorized",
    Refused = "Refused",
    Unknown = "Unknown",
    Registered = "Registered",
    Refunded = "Refunded",
    Refunding = "Refunding",
    Contested = "Contested",
}

export enum PaymentType {
    Offline = "Offline",
    Credit = "Credit",
    Debit = "Debit",
}

export enum PaymentOfflineMeans {
    None = "None",
    Card = "Card",
    Check = "Check",
    Cash = "Cash",
    BankTransfer = "BankTransfer",
    Other = "Other",
}

export type Event = {
    eventType: EventType;
    data: Order | Payment | Form;
};

export type Order = {
    payer: Payer;
    items: [OrderItem];
    payments: [OrderPayment];
    amount: Amount;
    id: number;
    date: Date;
    formSlug: string;
    formType: FormType;
    organizationName: string;
    organizationSlug: string;
    meta: Metadata;
    isAnonymous: Boolean;
    isAmountHidden: Boolean;
};

export type OrderDetail = {
    payer: Payer;
    items: [OrderItem];
    payments: [OrderPayment];
    amount: Amount;
    id: number;
    date: Date;
    formSlug: string;
    formType: FormType;
    organizationName: string;
    organizationSlug: string;
    meta: Metadata;
};

export type OrderLight = {
    id: number;
    date: Date;
    formSlug: string;
    formType: FormType;
    organizationName: string;
    organizationSlug: string;
    checkoutIntentId: number;
    meta: Metadata;
    isAnonymous: Boolean;
    isAmountHidden: Boolean;
};

export type Item = {
    order: OrderLight;
    payer: Payer;
    payements: [ItemPayment];
    name: string;
    user: {
        firstName: string;
        lastName: string;
    };
    priceCategory: PriceCategory;
    minAmount: number;
    discount: {
        code: string;
        amount: number;
    };
    customFields: [CustomField];
    options: [Option];
    ticketUrl: string;
    qrCode: string;
    membershipCardUrl: string;
    dayOfLevy: number;
    tierDescription: string;
    tierId: number;
    comment: string;
    id: number;
    amount: number;
    type: ItemType;
};

export type OrderItem = {
    payements: [
        {
            id: number;
            shareAmount: number;
        }
    ];
    name: string;
    user: {
        firstName: string;
        lastName: string;
    };
    priceCategory: PriceCategory;
    minAmount: number;
    discount: {
        code: string;
        amount: number;
    };
    customFields: [CustomField];
    options: [Option];
    ticketUrl: string;
    qrCode: string;
    membershipCardUrl: string;
    dayOfLevy: number;
    tierDescription: string;
    tierId: number;
    comment: string;
    id: number;
    amount: number;
    type: ItemType;
    initialAmount: number;
    state: OrderState;
};

export type ItemPayment = {
    cashOutState: CashOutState;
    shareAmount: number;
    id: number;
    amount: number;
    amountTip: number;
    date: Date;
    paymentMeans: PaymentMeans;
    installmentNumber: number;
    state: PaymentState;
    type: PaymentType;
    meta: Metadata;
    paymentOffLineMean: PaymentOfflineMeans;
    refundOperations: [Object];
};

export type OrderPayment = {
    items: {
        id: number;
        shareAmount: number;
        shareItemAmount: number;
        shareItemOption: number;
    };
    cashOutDate: Date;
    cashOutState: CashOutState;
    paymentReceiptUrl: string;
    fiscalReceiptUrl: string;
    id: number;
    amount: number;
    amountTip: number;
    date: Date;
    paymentMeans: PaymentMeans;
    installmentNumber: number;
    state: PaymentState;
    type: PaymentType;
    meta: Metadata;
    paymentOffLineMean: PaymentOfflineMeans;
    refundOperations: [Object];
};

export type Payment = {
    order: OrderLight;
    payer: Payer;
    items: [Item];
    cashOutDate: Date;
    cashOutState: CashOutState;
    paymentReceiptUrl: string;
    id: number;
    amount: number;
    amountTip?: number;
    date: Date;
    paymentMeans: PaymentMeans;
    installmentNumber: number;
    state: PaymentState;
    meta: Metadata;
    refundOperations: [Object];
};

export type Form = Object;

export type Payer = {
    email: string;
    country: string;
    firstName: string;
    lastName: string;
    address?: string;
    city?: string;
    zipCode?: string;
    company?: string;
    dateOfBirth?: Date;
};

export type Amount = {
    total: number;
    vat: number;
    discount: number;
};

export type Metadata = {
    createdAt: Date;
    updatedAt: Date;
};

export type Option = {
    name: string;
    amount: number;
    priceCategory: PriceCategory;
    isRequired: boolean;
    customFields: [CustomField];
    optionId: number;
};

export type CustomField = {
    id: number;
    name: string;
    type: FieldType;
    answer: string;
};
