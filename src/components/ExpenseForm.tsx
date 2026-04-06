import { useForm, Controller, useWatch } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const categories = [
  { value: "Food", label: "🍔 Food" },
  { value: "Transport", label: "🚗 Transport" },
  { value: "Housing", label: "🏠 Housing" },
  { value: "Entertainment", label: "🎬 Entertainment" },
  { value: "Health", label: "💊 Health" },
  { value: "Shopping", label: "🛍️ Shopping" },
  { value: "Other", label: "📦 Other" },
];

const paymentMethods = ["Cash", "Credit Card", "Debit Card", "UPI"];

const expenseSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount is required" })
    .positive("Must be positive")
    .max(999999, "Amount too large"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Too long"),
  category: z.string().min(1, "Select a category"),
  date: z.date({ required_error: "Date is required" }),
  paymentMethod: z.string().min(1, "Select a payment method"),
  notes: z.string().max(500, "Notes too long").optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (data: ExpenseFormValues) => Promise<void>;
  submitLabel: string;
  loading: boolean;
}

const ExpenseForm = ({ defaultValues, onSubmit, submitLabel, loading }: ExpenseFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      category: "",
      date: new Date(),
      paymentMethod: "Cash",
      notes: "",
      ...defaultValues,
    },
  });

  // Auto-detect category from description
  const description = useWatch({ control, name: "description" });
  const category = useWatch({ control, name: "category" });

  useEffect(() => {
    if (!description || defaultValues?.category) return;
    const lower = description.toLowerCase();
    const keywordMap: Record<string, string[]> = {
      Food: [
        "food", "grocery", "restaurant", "lunch", "dinner", "breakfast", "coffee", "snack", "pizza", "burger", "meal", "eat", "drink", "cafe", "bakery",
        "swiggy", "zomato", "uber eats", "chips", "apple", "banana", "fruit", "vegetable", "rice", "bread", "milk", "egg", "chicken", "mutton", "fish",
        "meat", "paneer", "dal", "dosa", "idli", "biryani", "noodle", "pasta", "sandwich", "salad", "juice", "tea", "ice cream", "chocolate", "biscuit",
        "cookie", "cake", "sweet", "sugar", "oil", "butter", "cheese", "yogurt", "curd", "cereal", "oats", "corn", "tomato", "onion", "potato",
        "mango", "grape", "orange", "watermelon", "papaya", "pineapple", "strawberry", "lemon", "coconut", "almond", "cashew", "peanut", "walnut",
        "spice", "masala", "flour", "atta", "maida", "sauce", "ketchup", "jam", "honey", "soda", "cola", "pepsi", "coke", "water bottle",
        "canteen", "mess", "tiffin", "thali", "wrap", "roll", "momos", "chaat", "samosa", "vada", "pav", "bhaji", "paratha", "roti", "naan",
        "soup", "fries", "nugget", "steak", "sushi", "taco", "burrito", "kebab", "grill", "bbq", "popcorn", "donut", "waffle", "pancake",
        "smoothie", "milkshake", "latte", "cappuccino", "espresso", "frappe",
      ],
      Transport: [
        "transport", "uber", "ola", "cab", "taxi", "bus", "train", "metro", "fuel", "petrol", "diesel", "gas", "parking", "toll", "flight", "travel",
        "auto", "rickshaw", "bike", "car", "commute", "fare", "ticket", "pass", "highway", "lyft", "rapido",
      ],
      Housing: [
        "rent", "house", "home", "electricity", "water", "gas bill", "internet", "wifi", "maintenance", "repair", "plumber", "furniture",
        "apartment", "flat", "society", "emi", "mortgage", "cable", "broadband", "ac repair", "painting", "cleaning",
      ],
      Entertainment: [
        "movie", "netflix", "spotify", "game", "concert", "party", "subscription", "youtube", "amazon prime", "disney", "hotstar", "book",
        "theatre", "show", "event", "club", "pub", "bar", "karaoke", "stream", "hulu", "twitch", "gaming", "playstation", "xbox",
      ],
      Health: [
        "doctor", "hospital", "medicine", "pharmacy", "gym", "health", "medical", "dental", "eye", "insurance", "therapy", "yoga",
        "clinic", "lab test", "x-ray", "scan", "surgery", "vitamin", "supplement", "physiotherapy", "checkup", "consultation",
      ],
      Shopping: [
        "shopping", "amazon", "flipkart", "clothes", "shoes", "electronics", "gadget", "phone", "laptop", "watch", "gift", "online",
        "myntra", "ajio", "meesho", "dress", "shirt", "jeans", "bag", "accessory", "jewellery", "cosmetic", "makeup", "perfume",
      ],
    };
    let matched = "";
    for (const [cat, keywords] of Object.entries(keywordMap)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        matched = cat;
        break;
      }
    }
    if (matched && matched !== category) {
      setValue("category", matched);
    }
  }, [description, setValue, defaultValues?.category, category]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          className={errors.amount ? "border-destructive" : ""}
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Grocery shopping"
          className={errors.description ? "border-destructive" : ""}
          {...register("description")}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground",
                    errors.date && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      {/* Payment Method */}
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className={errors.paymentMethod ? "border-destructive" : ""}>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.paymentMethod && <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional details..."
          rows={3}
          className={errors.notes ? "border-destructive" : ""}
          {...register("notes")}
        />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
};

export default ExpenseForm;
export { categories };
