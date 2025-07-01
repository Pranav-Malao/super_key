import LogoutButton from "./LogoutButton";

export default function CurrentUser() {
  const user = JSON.parse(localStorage.getItem("user"));
  console.log(user)
  return (
    <div>
      <h1>Current User</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>Phone: {user.phone}</p>
      <p>Parent ID: {user.parentId}</p>
      <p>Hierarchy: {JSON.stringify(user.hierarchy)}</p>
      {user && <LogoutButton />}
    </div>
  );
}