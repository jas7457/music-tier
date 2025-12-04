For callbacks in React, always inline them. Instead of `const handleClick = () => {};... onClick={handleClick}` just do `onClick={()=>{}}`
