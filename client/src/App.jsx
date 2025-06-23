import { useQuery } from "@tanstack/react-query";

const test = async () => {
  const res = await fetch("/api/test");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Fetch failed");
  }
  return data;
};

const App = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["test"], // ✅ Fixed: Added comma
    queryFn: test,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1 className="heading center">Hello World</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default App;
